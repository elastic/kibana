/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiProgress, EuiText } from '@elastic/eui';
import { getDataViewsService } from '../kibana_services';
import { GeoUploadForm, OnFileSelectParameters } from './geo_upload_form';
import { ImportCompleteView } from './import_complete_view';
import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/public';
import type { FileUploadComponentProps, FileUploadGeoResults } from '../lazy_load_bundle';
import { ImportResults } from '../importer';
import { GeoFileImporter } from '../importer/geo';
import type { Settings } from '../../common/types';
import { hasImportPermission } from '../api';

enum PHASE {
  CONFIGURE = 'CONFIGURE',
  IMPORT = 'IMPORT',
  COMPLETE = 'COMPLETE',
}

function getWritingToIndexMsg(progress: number) {
  return i18n.translate('xpack.fileUpload.geoUploadWizard.writingToIndex', {
    defaultMessage: 'Writing to index: {progress}% complete',
    values: { progress },
  });
}

interface State {
  failedPermissionCheck: boolean;
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
  importStatus: string;
  importResults?: ImportResults;
  indexName: string;
  indexNameError?: string;
  dataViewResp?: object;
  phase: PHASE;
}

export class GeoUploadWizard extends Component<FileUploadComponentProps, State> {
  private _geoFileImporter?: GeoFileImporter;
  private _isMounted = false;

  state: State = {
    failedPermissionCheck: false,
    geoFieldType: ES_FIELD_TYPES.GEO_SHAPE,
    importStatus: '',
    indexName: '',
    phase: PHASE.CONFIGURE,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._geoFileImporter) {
      this._geoFileImporter.destroy();
      this._geoFileImporter = undefined;
    }
  }

  componentDidUpdate() {
    if (this.props.isIndexingTriggered && this.state.phase === PHASE.CONFIGURE) {
      this._import();
    }
  }

  _import = async () => {
    if (!this._geoFileImporter) {
      return;
    }

    //
    // check permissions
    //
    const canImport = await hasImportPermission({
      checkCreateDataView: true,
      checkHasManagePipeline: false,
      indexName: this.state.indexName,
    });
    if (!this._isMounted) {
      return;
    }
    if (!canImport) {
      this.setState({
        phase: PHASE.COMPLETE,
        failedPermissionCheck: true,
      });
      this.props.onUploadError();
      return;
    }

    //
    // create index
    //
    const settings = {
      number_of_shards: 1,
    } as unknown as Settings;
    const mappings = {
      properties: {
        geometry: {
          type: this.state.geoFieldType,
        },
      },
    };
    const ingestPipeline = {
      description: '',
      processors: [],
    };
    this.setState({
      importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataIndexingStarted', {
        defaultMessage: 'Creating index: {indexName}',
        values: { indexName: this.state.indexName },
      }),
      phase: PHASE.IMPORT,
    });
    this._geoFileImporter.setGeoFieldType(this.state.geoFieldType);
    const initializeImportResp = await this._geoFileImporter.initializeImport(
      this.state.indexName,
      settings,
      mappings,
      ingestPipeline
    );
    if (!this._isMounted) {
      return;
    }
    if (initializeImportResp.index === undefined || initializeImportResp.id === undefined) {
      this.setState({
        phase: PHASE.COMPLETE,
        importResults: initializeImportResp,
      });
      this.props.onUploadError();
      return;
    }

    //
    // import file
    //
    this.setState({
      importStatus: getWritingToIndexMsg(0),
    });
    const importResults = await this._geoFileImporter.import(
      initializeImportResp.id,
      this.state.indexName,
      initializeImportResp.pipelineId,
      (progress) => {
        if (this._isMounted) {
          this.setState({
            importStatus: getWritingToIndexMsg(progress),
          });
        }
      }
    );
    if (!this._isMounted) {
      return;
    }

    if (!importResults.success) {
      this.setState({
        importResults,
        importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataIndexingError', {
          defaultMessage: 'Data indexing error',
        }),
        phase: PHASE.COMPLETE,
      });
      this.props.onUploadError();
      return;
    }

    //
    // create index pattern
    //
    this.setState({
      importResults,
      importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.creatingDataView', {
        defaultMessage: 'Creating data view: {indexName}',
        values: { indexName: this.state.indexName },
      }),
    });
    let dataView;
    let results: FileUploadGeoResults | undefined;
    try {
      dataView = await getDataViewsService().createAndSave(
        {
          title: this.state.indexName,
        },
        true
      );
      if (!dataView.id) {
        throw new Error('id not provided');
      }
      const geoField = dataView.fields.find((field) =>
        [ES_FIELD_TYPES.GEO_POINT as string, ES_FIELD_TYPES.GEO_SHAPE as string].includes(
          field.type
        )
      );
      if (!geoField) {
        throw new Error('geo field not created');
      }
      results = {
        indexPatternId: dataView.id,
        geoFieldName: geoField.name,
        geoFieldType: geoField.type as ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE,
        docCount: importResults.docCount !== undefined ? importResults.docCount : 0,
      };
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataViewError', {
            defaultMessage: 'Unable to create data view',
          }),
          phase: PHASE.COMPLETE,
        });
        this.props.onUploadError();
      }
      return;
    }
    if (!this._isMounted) {
      return;
    }

    //
    // Successful import
    //
    this.setState({
      dataViewResp: {
        success: true,
        id: dataView.id,
        fields: dataView.fields,
      },
      phase: PHASE.COMPLETE,
      importStatus: '',
    });
    this.props.onUploadComplete(results!);
  };

  _onFileSelect = ({ features, importer, indexName, previewCoverage }: OnFileSelectParameters) => {
    this._geoFileImporter = importer;

    this.props.onFileSelect(
      {
        type: 'FeatureCollection',
        features,
      },
      indexName,
      previewCoverage
    );
  };

  _onFileClear = () => {
    if (this._geoFileImporter) {
      this._geoFileImporter.destroy();
      this._geoFileImporter = undefined;
    }

    this.props.onFileClear();
  };

  _onGeoFieldTypeSelect = (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => {
    this.setState({ geoFieldType });
  };

  _onIndexNameChange = (name: string, error?: string) => {
    this.setState({
      indexName: name,
      indexNameError: error,
    });

    const isReadyToImport = !!name && error === undefined;
    if (isReadyToImport) {
      this.props.enableImportBtn();
    } else {
      this.props.disableImportBtn();
    }
  };

  render() {
    if (this.state.phase === PHASE.IMPORT) {
      return (
        <Fragment>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <EuiText>
            <p>{this.state.importStatus}</p>
          </EuiText>
        </Fragment>
      );
    }

    if (this.state.phase === PHASE.COMPLETE) {
      return (
        <ImportCompleteView
          importResults={this.state.importResults}
          dataViewResp={this.state.dataViewResp}
          indexName={this.state.indexName}
          failedPermissionCheck={this.state.failedPermissionCheck}
        />
      );
    }

    return (
      <GeoUploadForm
        geoFieldType={this.state.geoFieldType}
        indexName={this.state.indexName}
        indexNameError={this.state.indexNameError}
        onFileClear={this._onFileClear}
        onFileSelect={this._onFileSelect}
        onGeoFieldTypeSelect={this._onGeoFieldTypeSelect}
        onIndexNameChange={this._onIndexNameChange}
        onIndexNameValidationStart={this.props.disableImportBtn}
        onIndexNameValidationEnd={this.props.enableImportBtn}
      />
    );
  }
}
