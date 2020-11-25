/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Cytoscape, Controls, JobMapLegend } from './components';
import { useMlKibana } from '../../../contexts/kibana';
import { JOB_MAP_NODE_TYPES } from '../../../../../common/constants/data_frame_analytics';
import { useRefDimensions } from './components/use_ref_dimensions';
import { useFetchAnalyticsMapData } from './use_fetch_analytics_map_data';

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

interface Props {
  analyticsId?: string;
  modelId?: string;
}

export const JobMap: FC<Props> = ({ analyticsId, modelId }) => {
  const [itemsDeleted, setItemsDeleted] = useState<boolean>(false);
  const [resetCy, setResetCy] = useState<boolean>(false);
  const {
    elements,
    error,
    getDataWrapper,
    isLoading,
    message,
    nodeDetails,
    setElements,
    setError,
  } = useFetchAnalyticsMapData();

  const {
    services: { notifications },
  } = useMlKibana();

  if (message !== undefined) {
    notifications.toasts.add(message);
  }

  const updateElements = (nodeId: string, nodeLabel: string, destIndexNode?: string) => {
    // Remove job element
    const filteredElements = elements.filter((e: any) => {
      // Filter out job node and related edges, including trained model node.
      let condition = e.data.id !== nodeId && e.data.target !== nodeId && e.data.source !== nodeId;

      if (e.data.type === JOB_MAP_NODE_TYPES.TRAINED_MODEL) {
        // remove training model node related to that job
        condition =
          condition && nodeDetails[e.data.id]?.metadata?.analytics_config?.id !== nodeLabel;
      }

      if (destIndexNode !== undefined) {
        // Filter out destination index node for that job
        return (
          condition &&
          e.data.id !== destIndexNode &&
          e.data.target !== destIndexNode &&
          e.data.source !== destIndexNode
        );
      }

      return condition;
    });
    setItemsDeleted(true);
    setElements(filteredElements);
  };

  useEffect(() => {
    getDataWrapper({ analyticsId, modelId });
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
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <JobMapTitle analyticsId={analyticsId} modelId={modelId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <JobMapLegend />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" component="span">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  data-test-subj={`mlAnalyticsRefreshMapButton${
                    isLoading ? ' loading' : ' loaded'
                  }`}
                  onClick={() => getDataWrapper({ analyticsId, modelId })}
                  isLoading={isLoading}
                >
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsList.refreshMapButtonLabel"
                    defaultMessage="Refresh"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  data-test-subj="mlAnalyticsResetGraphButton"
                  onClick={() => setResetCy(!resetCy)}
                >
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsList.resetMapButtonLabel"
                    defaultMessage="Reset"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <Cytoscape
          height={height}
          elements={elements}
          width={width}
          style={cytoscapeDivStyle}
          itemsDeleted={itemsDeleted}
          resetCy={resetCy}
        >
          <Controls
            details={nodeDetails}
            getNodeData={getDataWrapper}
            analyticsId={analyticsId}
            modelId={modelId}
            updateElements={updateElements}
          />
        </Cytoscape>
      </div>
    </>
  );
};
