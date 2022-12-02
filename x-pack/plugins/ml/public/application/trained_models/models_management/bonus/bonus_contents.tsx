/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import rison, { RisonValue } from '@kbn/rison';

import {
  // EuiButton,
  // EuiFlexGroup,
  // EuiFlexItem,
  EuiSpacer,
  // EuiProgress,
  // EuiSteps,
  // EuiIcon,
  // EuiLoadingSpinner,
  // EuiFormRow,
  // EuiCallOut,
  // EuiSuperSelect,
  // EuiText,
  // EuiTitle,
  // useEuiTheme,
  // EuiHorizontalRule,
  EuiCodeBlock,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { useMlKibana } from '../../../contexts/kibana';
// import { HuggingFaceTrainedModel } from '../../../../../common/types/trained_models';
// import { SUPPORTED_PYTORCH_TASKS } from '../../../../../common/constants/trained_models';

interface Props {
  refreshModels: () => void;
  processors: any;
  dataview: DataView;
}
export const BonusContent: FC<Props> = ({ processors, dataview }) => {
  const {
    services: {
      http: { post, basePath },
      mlServices: {
        mlApiServices: {
          trainedModels: { reIndex },
        },
      },
    },
  } = useMlKibana();

  const { pipelineId: getPipelineId2, taskType } = getPipelineId(processors);

  const [pipelineId, setPipelineId] = useState(getPipelineId2);
  const [pipelineDescription, setPipelineDescription] = useState('');
  const [pipelineCreated, setPipelineCreated] = useState(false);
  const [indexName, setIndexName] = useState(dataview.getIndexPattern() + `-${taskType}`);
  const [indexCreated, setindexCreated] = useState(false);
  const [dataViewId, setDataViewId] = useState('');

  // const {
  //   euiTheme: { colors },
  // } = useEuiTheme();

  const reindex = async () => {
    setPipelineCreated(true);
    try {
      const gg = await reIndex(
        dataview.getIndexPattern(),
        indexName,
        pipelineDescription,
        pipelineId,
        processors.processors
      );

      setDataViewId(gg.dataviewId);
      // const ss = await post('/api/ingest_pipelines', {
      //   body: JSON.stringify({
      //     name: pipelineName,
      //     ...processors,
      //   }),
      // });
    } catch (error) {
      setPipelineCreated(false);
      // console.log(error);
    }
  };

  const openInDiscover = () => {
    const appStateProps: RisonValue = {
      index: dataViewId,
    };

    const _a = rison.encode(appStateProps);

    const _g = rison.encode({
      refreshInterval: {
        display: 'Off',
        pause: true,
        value: 0,
      },
      time: {
        from: 'now-3y',
        to: 'now',
      },
    });

    let path = basePath.get();
    path += '/app/discover#/';
    path += '?_g=' + _g;
    path += '&_a=' + encodeURIComponent(_a);
    window.open(path, '_blank');
  };

  return (
    <>
      <EuiFormRow label="Pipeline name">
        <EuiFieldText
          disabled={pipelineCreated}
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFormRow>
      <EuiFormRow label="Pipeline Description">
        <EuiFieldText
          disabled={pipelineCreated}
          value={pipelineDescription}
          onChange={(e) => setPipelineDescription(e.target.value)}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFormRow>
      <EuiFormRow label="Processors">
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" lineNumbers isCopyable={true}>
          {JSON.stringify(processors, null, 2)}
        </EuiCodeBlock>
      </EuiFormRow>

      <>
        <EuiSpacer />
        <EuiFormRow label="Index name">
          <EuiFieldText
            disabled={pipelineCreated}
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
        <EuiButton disabled={pipelineCreated} onClick={() => reindex()}>
          Re-index
        </EuiButton>

        {dataViewId !== '' ? (
          <>
            <EuiSpacer />
            <EuiButtonEmpty onClick={() => openInDiscover()}>Open in discover</EuiButtonEmpty>
          </>
        ) : null}
      </>
    </>
  );
};

function getPipelineId(processors: any) {
  return {
    pipelineId: processors.processors[0].inference.model_id,
    taskType: processors.processors[0].inference.target_field,
  };
}
