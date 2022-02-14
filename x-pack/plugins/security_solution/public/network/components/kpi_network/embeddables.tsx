/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiHorizontalRule,
  EuiSplitPanel,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { NetworkKpiEmbessablesProps } from './types';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { kpiUniquePrivateIpsSourceMetric } from '../../configs/kpi_unique_private_ips-source_metric';
import { kpiNetworkEvents } from '../../configs/kpi_network_events';
import { kpiUniqueFlowIds } from '../../configs/kpi_unique_flow_ids';
import { kpiTlsHandshakes } from '../../configs/kpi_tls_handshakes';
import { kpiUniquePrivateIpsBar } from '../../configs/kpi_unique_private_ips-bar';
import { kpiUniquePrivateIpsArea } from '../../configs/kpi_unique_private_ips-area';
import { kpiDnsQueries } from '../../configs/kpi_dns_queries';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { kpiUniquePrivateIpsDestinationMetric } from '../../configs/kpi_unique_private_ips-destination_metric';
import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import { DNS_QUERIES } from './dns/translations';
import { UNIQUE_FLOW_IDS } from './unique_flows/translations';
import { TLS_HANDSHAKES } from './tls_handshakes/translations';
import {
  UNIQUE_PRIVATE_IPS,
  SOURCE_UNIT_LABEL,
  DESTINATION_UNIT_LABEL,
} from './unique_private_ips/translations';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
const panelHeight = '125px';
const metricHeight = '75px';
const attrsMapping = {
  kpiNetworkEvents,
  kpiUniqueFlowIds,
  kpiTlsHandshakes,
  kpiDnsQueries,
  kpiUniquePrivateIpsBar,
  kpiUniquePrivateIpsArea,
  kpiUniquePrivateIpsSourceMetric,
  kpiUniquePrivateIpsDestinationMetric,
};

export const NetworkKpiEmbeddablesComponent = React.memo<NetworkKpiEmbessablesProps>(
  ({ filterQuery, from, to, inputsModelId = 'global' }) => {
    const timerange = useMemo<TimeRange>(
      () => ({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        mode: 'absolute',
      }),
      [from, to]
    );
    const dispatch = useDispatch();

    const { patternList, dataViewId } = useSourcererDataView();

    const customLensAttrs = useMemo(
      () =>
        Object.keys(attrsMapping).reduce(
          (acc, id) => ({
            ...acc,
            [id]: {
              ...attrsMapping[id],
              references: attrsMapping[id].references.map((ref) => ({ ...ref, id: dataViewId })),
            },
          }),
          {}
        ),
      [dataViewId]
    );

    const onBrushEnd = useCallback(
      ({ range }: { range: number[] }) => {
        dispatch(
          setAbsoluteRangeDatePicker({
            id: inputsModelId,
            from: new Date(range[0]).toISOString(),
            to: new Date(range[1]).toISOString(),
          })
        );
      },
      [dispatch, inputsModelId]
    );

    const dataTypesIndexPatterns = useMemo(() => patternList?.join(','), [patternList]);

    return (
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <EmbeddableHistogram
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.network.kpiNetworkEventsTitle"
                      defaultMessage="Network events"
                    />
                  }
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  customLensAttrs={customLensAttrs.kpiNetworkEvents}
                  customTimeRange={timerange}
                  isSingleMetric={true}
                  metricIconColor="#6092c0"
                  onBrushEnd={onBrushEnd}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <EmbeddableHistogram
                  title={DNS_QUERIES}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  customLensAttrs={customLensAttrs.kpiDnsQueries}
                  customTimeRange={timerange}
                  isSingleMetric={true}
                  metricIconColor="#6092c0"
                  onBrushEnd={onBrushEnd}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <EmbeddableHistogram
                  title={UNIQUE_FLOW_IDS}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  customLensAttrs={customLensAttrs.kpiUniqueFlowIds}
                  customTimeRange={timerange}
                  isSingleMetric={true}
                  metricIconColor="#6092c0"
                  onBrushEnd={onBrushEnd}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <EmbeddableHistogram
                  title={TLS_HANDSHAKES}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  customLensAttrs={customLensAttrs.kpiTlsHandshakes}
                  customTimeRange={timerange}
                  isSingleMetric={true}
                  metricIconColor="#6092c0"
                  onBrushEnd={onBrushEnd}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ maxWidth: '50%' }}>
          <EuiPanel
            color="transparent"
            hasBorder
            style={{ height: '100%', flexDirection: 'column', display: 'flex' }}
            paddingSize="m"
          >
            <EuiTitle size="xs">
              <h3>{UNIQUE_PRIVATE_IPS}</h3>
            </EuiTitle>
            <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
              <EuiSplitPanel.Inner paddingSize="none" style={{ width: '50%' }}>
                <StyledEuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                    <EmbeddableHistogram
                      dataTypesIndexPatterns={dataTypesIndexPatterns}
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsSourceMetric}
                      customTimeRange={timerange}
                      metricIcon="visMapCoordinate"
                      metricPostfix={SOURCE_UNIT_LABEL}
                      metricIconColor="#d36086"
                      onBrushEnd={onBrushEnd}
                      isSingleMetric={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule margin="xs" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EmbeddableHistogram
                      dataTypesIndexPatterns={dataTypesIndexPatterns}
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsBar}
                      customTimeRange={timerange}
                      onBrushEnd={onBrushEnd}
                      isSingleMetric={false}
                    />
                  </EuiFlexItem>
                </StyledEuiFlexGroup>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner paddingSize="none" style={{ width: '50%' }}>
                <StyledEuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                    <EmbeddableHistogram
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsDestinationMetric}
                      customTimeRange={timerange}
                      dataTypesIndexPatterns={dataTypesIndexPatterns}
                      metricIcon="visMapCoordinate"
                      metricIconColor="#9170b8"
                      metricPostfix={DESTINATION_UNIT_LABEL}
                      onBrushEnd={onBrushEnd}
                      isSingleMetric={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule margin="xs" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EmbeddableHistogram
                      dataTypesIndexPatterns={dataTypesIndexPatterns}
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsArea}
                      customTimeRange={timerange}
                      onBrushEnd={onBrushEnd}
                      isSingleMetric={false}
                    />
                  </EuiFlexItem>
                </StyledEuiFlexGroup>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

NetworkKpiEmbeddablesComponent.displayName = 'NetworkKpiEmbeddablesComponent';
