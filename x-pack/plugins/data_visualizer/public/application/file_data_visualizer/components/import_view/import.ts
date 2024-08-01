/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type {
  FindFileStructureResponse,
  IngestPipeline,
} from '@kbn/file-upload-plugin/common/types';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { i18n } from '@kbn/i18n';
import { IMPORT_STATUS } from '../import_progress/import_progress';

interface Props {
  data: ArrayBuffer;
  results: FindFileStructureResponse;
  dataViewsContract: DataViewsServicePublic;
  fileUpload: FileUploadStartApi;
}

interface Config {
  index: string;
  dataView: string;
  createDataView: boolean;
  indexSettingsString: string;
  mappingsString: string;
  pipelineString: string;
  pipelineId: string | null;
}

export async function importData(props: Props, config: Config, setState: (state: unknown) => void) {
  const { data, results, dataViewsContract, fileUpload } = props;
  const {
    index,
    dataView,
    createDataView,
    indexSettingsString,
    mappingsString,
    pipelineString,
    pipelineId,
  } = config;
  const { format } = results;

  const errors = [];

  if (index === '') {
    return;
  }

  if (
    (await fileUpload.hasImportPermission({
      checkCreateDataView: createDataView,
      checkHasManagePipeline: true,
      indexName: index,
    })) === false
  ) {
    errors.push(
      i18n.translate('xpack.dataVisualizer.file.importView.importPermissionError', {
        defaultMessage: 'You do not have permission to create or import data into index {index}.',
        values: {
          index,
        },
      })
    );
    setState({
      permissionCheckStatus: IMPORT_STATUS.FAILED,
      importing: false,
      imported: false,
      errors,
    });
    return;
  }

  setState({
    importing: true,
    imported: false,
    reading: true,
    initialized: true,
    permissionCheckStatus: IMPORT_STATUS.COMPLETE,
  });

  let success = true;

  let settings = {};
  let mappings = {};
  let pipeline = {};

  try {
    settings = JSON.parse(indexSettingsString);
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parseSettingsError', {
      defaultMessage: 'Error parsing settings:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  try {
    mappings = JSON.parse(mappingsString);
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parseMappingsError', {
      defaultMessage: 'Error parsing mappings:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  try {
    pipeline = JSON.parse(pipelineString);
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parsePipelineError', {
      defaultMessage: 'Error parsing ingest pipeline:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  setState({
    parseJSONStatus: getSuccess(success),
  });

  if (success === false) {
    return;
  }

  const importer = await fileUpload.importerFactory(format, {
    excludeLinesPattern: results.exclude_lines_pattern,
    multilineStartPattern: results.multiline_start_pattern,
  });

  const readResp = importer.read(data);
  success = readResp.success;
  setState({
    readStatus: getSuccess(success),
    reading: false,
    importer,
  });

  if (success === false) {
    return;
  }

  const initializeImportResp = await importer.initializeImport(
    index,
    settings,
    mappings,
    pipeline as IngestPipeline
  );

  const timeFieldName = importer.getTimeField();
  setState({ timeFieldName });

  const indexCreated = initializeImportResp.index !== undefined;
  setState({
    indexCreatedStatus: getSuccess(indexCreated),
  });

  const pipelineCreated = initializeImportResp.pipelineId !== undefined;
  if (indexCreated) {
    setState({
      ingestPipelineCreatedStatus: pipelineCreated ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
      pipelineId: pipelineCreated ? initializeImportResp.pipelineId : '',
    });
  }
  success = indexCreated && pipelineCreated;

  if (success === false) {
    errors.push(initializeImportResp.error);
    return;
  }

  const importResp = await importer.import(
    initializeImportResp.id,
    index,
    pipelineId ?? initializeImportResp.pipelineId,
    (progress: number) => {
      setState({
        uploadProgress: progress,
      });
    }
  );
  success = importResp.success;
  setState({
    uploadStatus: getSuccess(importResp.success),
    importFailures: importResp.failures,
    docCount: importResp.docCount,
  });

  if (success === false) {
    errors.push(importResp.error);
    return;
  }

  if (createDataView) {
    const dataViewName = dataView === '' ? index : dataView;
    const dataViewResp = await createKibanaDataView(dataViewName, dataViewsContract, timeFieldName);
    success = dataViewResp.success;
    setState({
      dataViewCreatedStatus: dataViewResp.success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
      dataViewId: dataViewResp.id,
    });
    if (success === false) {
      errors.push(dataViewResp.error);
    }
  }

  setState({
    importing: false,
    imported: success,
    errors,
  });
}

async function createKibanaDataView(
  dataViewName: string,
  dataViewsContract: DataViewsServicePublic,
  timeFieldName?: string
) {
  try {
    const emptyPattern = await dataViewsContract.createAndSave({
      title: dataViewName,
      timeFieldName,
    });

    return {
      success: true,
      id: emptyPattern.id,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

function getSuccess(success: boolean) {
  return success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED;
}
