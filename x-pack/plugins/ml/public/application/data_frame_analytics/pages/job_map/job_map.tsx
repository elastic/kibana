/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Cytoscape, Controls, JobMapLegend } from './components';
import { useMlKibana, useMlUrlGenerator } from '../../../contexts/kibana';
import { JOB_MAP_NODE_TYPES } from '../../../../../common/constants/data_frame_analytics';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { useRefDimensions } from './components/use_ref_dimensions';
import { useFetchAnalyticsMapData } from './use_fetch_analytics_map_data';
import { JobMapTitle } from './job_map_title';

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

interface Props {
  analyticsId?: string;
  modelId?: string;
}

export const JobMap: FC<Props> = ({ analyticsId, modelId }) => {
  // itemsDeleted will reset to false when Controls component calls updateElements to remove nodes deleted from map
  const [itemsDeleted, setItemsDeleted] = useState<boolean>(false);
  const [resetCyToggle, setResetCyToggle] = useState<boolean>(false);
  const {
    elements,
    error,
    fetchAndSetElementsWrapper,
    isLoading,
    message,
    nodeDetails,
    setElements,
    setError,
  } = useFetchAnalyticsMapData();

  const {
    services: {
      notifications,
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const urlGenerator = useMlUrlGenerator();

  const redirectToAnalyticsManagementPage = async () => {
    const url = await urlGenerator.createUrl({ page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE });
    await navigateToUrl(url);
  };

  const updateElements = (nodeId: string, nodeLabel: string, destIndexNode?: string) => {
    // If removing the root job just go back to the jobs list
    if (nodeLabel === analyticsId) {
      redirectToAnalyticsManagementPage();
    } else {
      // Remove job element
      const filteredElements = elements.filter((e) => {
        // Filter out job node and related edges, including trained model node.
        let isNotDeletedNodeOrRelated =
          e.data.id !== nodeId && e.data.target !== nodeId && e.data.source !== nodeId;

        if (e.data.id !== undefined && e.data.type === JOB_MAP_NODE_TYPES.TRAINED_MODEL) {
          // remove training model node related to that job
          isNotDeletedNodeOrRelated =
            isNotDeletedNodeOrRelated &&
            nodeDetails[e.data.id]?.metadata?.analytics_config?.id !== nodeLabel;
        }

        if (destIndexNode !== undefined) {
          // Filter out destination index node for that job
          return (
            isNotDeletedNodeOrRelated &&
            e.data.id !== destIndexNode &&
            e.data.target !== destIndexNode &&
            e.data.source !== destIndexNode
          );
        }

        return isNotDeletedNodeOrRelated;
      });
      setItemsDeleted(true);
      setElements(filteredElements);
    }
  };

  useEffect(() => {
    fetchAndSetElementsWrapper({ analyticsId, modelId });
  }, [analyticsId, modelId]);

  useEffect(() => {
    if (message !== undefined) {
      notifications.toasts.add(message);
    }
  }, [message]);

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
                data-test-subj={`mlAnalyticsRefreshMapButton${isLoading ? ' loading' : ' loaded'}`}
                onClick={() => fetchAndSetElementsWrapper({ analyticsId, modelId })}
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
                // trigger reset on value change
                onClick={() => setResetCyToggle(!resetCyToggle)}
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
      <div style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) - 20 }} ref={ref}>
        <Cytoscape
          height={height - 20}
          elements={elements}
          width={width}
          style={cytoscapeDivStyle}
          itemsDeleted={itemsDeleted}
          resetCy={resetCyToggle}
        >
          <Controls
            details={nodeDetails}
            getNodeData={fetchAndSetElementsWrapper}
            analyticsId={analyticsId}
            modelId={modelId}
            updateElements={updateElements}
          />
        </Cytoscape>
      </div>
    </>
  );
};
