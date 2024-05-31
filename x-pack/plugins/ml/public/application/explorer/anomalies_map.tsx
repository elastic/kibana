/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import { INITIAL_LOCATION } from '@kbn/maps-plugin/common';
import {
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  COLOR_MAP_TYPE,
} from '@kbn/maps-plugin/common';
import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { useMlKibana } from '../contexts/kibana';

const MAX_ENTITY_VALUES = 3;

function getAnomalyRows(anomalies: MlAnomaliesTableRecord[], jobId: string) {
  const anomalyRows: Record<string, { count: number; entityValue: string; max_severity: number }> =
    {};
  for (let i = 0; i < anomalies.length; i++) {
    const anomaly = anomalies[i];
    const location = anomaly.entityValue;
    if (anomaly.jobId !== jobId) continue;

    if (anomalyRows[location] === undefined) {
      // add it to the object and set count to 1
      anomalyRows[location] = {
        count: 1,
        entityValue: location,
        max_severity: Math.floor(anomaly.severity),
      };
    } else {
      anomalyRows[location].count += 1;
      if (anomaly.severity > anomalyRows[location].max_severity) {
        anomalyRows[location].max_severity = Math.floor(anomaly.severity);
      }
    }
  }
  return Object.values(anomalyRows);
}

export const getChoroplethAnomaliesLayer = (
  anomalies: MlAnomaliesTableRecord[],
  { layerId, field, jobId }: MLEMSTermJoinConfig
): VectorLayerDescriptor => {
  return {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.ml.explorer.anomaliesMap.anomaliesCount', {
      defaultMessage: 'Anomalies count: {jobId}',
      values: { jobId },
    }),
    joins: [
      {
        // Left join is the id from the type of field (e.g. world_countries)
        leftField: field,
        right: {
          id: 'anomaly_count',
          type: SOURCE_TYPES.TABLE_SOURCE,
          __rows: getAnomalyRows(anomalies, jobId),
          __columns: [
            {
              name: 'entityValue',
              type: 'string',
            },
            {
              name: 'count',
              type: 'number',
            },
            {
              name: 'max_severity',
              type: 'number',
            },
          ],
          // Right join/term is the field in the doc you’re trying to join it to (foreign key - e.g. US)
          term: 'entityValue',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: layerId,
    },
    style: {
      type: 'VECTOR',
      // @ts-ignore missing style properties. Remove once 'VectorLayerDescriptor' type is updated
      properties: {
        icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
        fillColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: COLOR_MAP_TYPE.ORDINAL,
            field: {
              name: 'count',
              origin: FIELD_ORIGIN.JOIN,
            },
            useCustomColorRamp: false,
          },
        },
        lineColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: { fieldMetaOptions: { isEnabled: true } },
        },
        lineWidth: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
      },
      isTimeAware: true,
    },
    visible: false,
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };
};

interface Props {
  anomalies: MlAnomaliesTableRecord[];
  jobIds: string[];
}

interface MLEMSTermJoinConfig extends EMSTermJoinConfig {
  jobId: string;
}

export const AnomaliesMap: FC<Props> = ({ anomalies, jobIds }) => {
  const [EMSSuggestions, setEMSSuggestions] = useState<MLEMSTermJoinConfig[] | undefined>();
  const {
    services: { maps: mapsPlugin },
  } = useMlKibana();

  const getEMSTermSuggestions = useCallback(async (): Promise<void> => {
    if (!mapsPlugin) return;

    const suggestions = await Promise.all(
      jobIds.map(async (jobId) => {
        const entityValues = new Set<string>();
        let entityName;
        for (let i = 0; i < anomalies.length; i++) {
          if (
            jobId === anomalies[i].jobId &&
            anomalies[i].entityValue !== '' &&
            anomalies[i].entityValue !== undefined &&
            anomalies[i].entityName !== '' &&
            anomalies[i].entityName !== undefined
          ) {
            entityValues.add(anomalies[i].entityValue);

            if (!entityName) {
              entityName = anomalies[i].entityName;
            }
          }

          if (
            // convert to set so it's unique values
            entityValues.size === MAX_ENTITY_VALUES
          )
            break;
        }

        const suggestion: EMSTermJoinConfig | null = await mapsPlugin.suggestEMSTermJoinConfig({
          sampleValues: Array.from(entityValues),
          sampleValuesColumnName: entityName || '',
        });
        if (suggestion) {
          return { jobId, ...suggestion };
        }
        return suggestion;
      })
    );

    setEMSSuggestions(suggestions.filter(isDefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...jobIds]);

  useEffect(
    function getInitialEMSTermSuggestions() {
      if (anomalies && anomalies.length > 0) {
        getEMSTermSuggestions();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...jobIds]
  );

  const layerList: VectorLayerDescriptor[] = useMemo(() => {
    if (!EMSSuggestions?.length) return [];

    return EMSSuggestions.map((suggestion) => {
      return getChoroplethAnomaliesLayer(anomalies, suggestion);
    }, [] as VectorLayerDescriptor[]);
  }, [EMSSuggestions, anomalies]);

  const layersWithAnomalies = layerList.filter((layer) => {
    // @ts-ignore _rows does not exist - can remove when VectorLayerDescriptor is updated
    const rows = Array.isArray(layer.joins) ? layer.joins[0]?.right?.__rows : [];
    return rows.length;
  });

  // set the layer with anomalies to visible
  if (layersWithAnomalies.length > 0) {
    layersWithAnomalies[0].visible = true;
  }

  if (EMSSuggestions?.length === 0 || layersWithAnomalies.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPanel data-test-subj="mlAnomaliesMapContainer" hasShadow={false} hasBorder>
        <EuiAccordion
          id="mlAnomalyExplorerAnomaliesMapAccordionId"
          initialIsOpen={true}
          buttonContent={
            <EuiTitle size={'xs'}>
              <h2>
                <FormattedMessage
                  id="xpack.ml.explorer.mapTitle"
                  defaultMessage="Anomaly count by location {infoTooltip}"
                  values={{
                    infoTooltip: (
                      <EuiIconTip
                        content="Map colors indicate the number of anomalies in each area."
                        position="top"
                        type="iInCircle"
                      />
                    ),
                  }}
                />
              </h2>
            </EuiTitle>
          }
        >
          <div
            data-test-subj="mlAnomalyExplorerAnomaliesMap"
            style={{ width: '100%', height: 300 }}
          >
            {mapsPlugin && (
              <mapsPlugin.Map
                layerList={layerList}
                hideFilterActions={true}
                mapSettings={{
                  initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS,
                  autoFitToDataBounds: true,
                }}
              />
            )}
          </div>
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
