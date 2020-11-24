/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import cytoscape from 'cytoscape';
import { uniqWith, isEqual } from 'lodash';

import { Cytoscape, Controls, JobMapLegend } from './components';
import { ml } from '../../../services/ml_api_service';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefDimensions } from './components/use_ref_dimensions';
import { JOB_MAP_NODE_TYPES } from '../../../../../common/constants/data_frame_analytics';

const cytoscapeDivStyle = {
  background: `linear-gradient(
  90deg,
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.euiColorLightShade}`,
  backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`,
  margin: `-${theme.gutterTypes.gutterLarge}`,
  marginTop: 0,
};

export const JobMapTitle: React.FC<{ analyticsId?: string; modelId?: string }> = ({
  analyticsId,
  modelId,
}) => (
  <EuiTitle size="xs">
    <span>
      {analyticsId
        ? i18n.translate('xpack.ml.dataframe.analyticsMap.analyticsIdTitle', {
            defaultMessage: 'Map for analytics ID {analyticsId}',
            values: { analyticsId },
          })
        : i18n.translate('xpack.ml.dataframe.analyticsMap.modelIdTitle', {
            defaultMessage: 'Map for trained model ID {modelId}',
            values: { modelId },
          })}
    </span>
  </EuiTitle>
);

interface GetDataObjectParameter {
  id: string;
  type: string;
}

interface Props {
  analyticsId?: string;
  modelId?: string;
}

export const JobMap: FC<Props> = ({ analyticsId, modelId }) => {
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [nodeDetails, setNodeDetails] = useState({});
  const [error, setError] = useState(undefined);

  const {
    services: { notifications },
  } = useMlKibana();

  const getDataWrapper = async (params?: GetDataObjectParameter) => {
    const { id, type } = params ?? {};
    const treatAsRoot = id !== undefined;
    let idToUse: string;

    if (id !== undefined) {
      idToUse = id;
    } else if (modelId !== undefined) {
      idToUse = modelId;
    } else {
      idToUse = analyticsId as string;
    }

    await getData(
      idToUse,
      treatAsRoot,
      modelId !== undefined && treatAsRoot === false ? JOB_MAP_NODE_TYPES.TRAINED_MODEL : type
    );
  };

  const getData = async (idToUse: string, treatAsRoot: boolean, type?: string) => {
    // Pass in treatAsRoot flag - endpoint will take job or index to grab jobs created from it
    // TODO: update analyticsMap return type here
    const analyticsMap: any = await ml.dataFrameAnalytics.getDataFrameAnalyticsMap(
      idToUse,
      treatAsRoot,
      type
    );

    const { elements: nodeElements, details, error: fetchError } = analyticsMap;

    if (fetchError !== null) {
      setError(fetchError);
    }

    if (nodeElements && nodeElements.length === 0) {
      notifications.toasts.add(
        i18n.translate('xpack.ml.dataframe.analyticsMap.emptyResponseMessage', {
          defaultMessage: 'No related analytics jobs found for {id}.',
          values: { id: idToUse },
        })
      );
    }

    if (nodeElements && nodeElements.length > 0) {
      if (treatAsRoot === false) {
        setElements(nodeElements);
        setNodeDetails(details);
      } else {
        const uniqueElements = uniqWith([...nodeElements, ...elements], isEqual);
        setElements(uniqueElements);
        setNodeDetails({ ...details, ...nodeDetails });
      }
    }
  };

  useEffect(() => {
    getDataWrapper();
  }, [analyticsId, modelId]);

  if (error !== undefined) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsMap.fetchDataErrorMessage', {
        defaultMessage: 'Unable to fetch some data. An error occurred: {error}',
        values: { error: JSON.stringify(error) },
      })
    );
    setError(undefined);
  }

  const { ref, width, height } = useRefDimensions();

  return (
    <>
      <EuiSpacer size="m" />
      <div style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) }} ref={ref}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <JobMapTitle analyticsId={analyticsId} modelId={modelId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <JobMapLegend />
          </EuiFlexItem>
        </EuiFlexGroup>
        <Cytoscape height={height} elements={elements} width={width} style={cytoscapeDivStyle}>
          <Controls
            details={nodeDetails}
            getNodeData={getDataWrapper}
            analyticsId={analyticsId}
            modelId={modelId}
          />
        </Cytoscape>
      </div>
    </>
  );
};
