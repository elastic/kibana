/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public/context/context';
import type { LensEmbeddableInput } from '../../../../../../lens/public/embeddable/embeddable';
import type { TypedLensByValueInput } from '../../../../../../lens/public/embeddable/embeddable_component';
import type { ObservabilityAppServices } from '../../../../application/types';
import { DataViewLabels } from '../configurations/constants/constants';
import { combineTimeRanges } from '../exploratory_view';
import { useSeriesStorage } from '../hooks/use_series_storage';

interface Props {
  seriesId: string;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ seriesId, lensAttributes }: Props) {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const { lens } = kServices;

  const { getSeries, allSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const LensSaveModalComponent = lens.SaveModalComponent;

  const timeRange = combineTimeRanges(allSeries, series);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText>
            <h2>
              {DataViewLabels[series.reportType] ??
                i18n.translate('xpack.observability.expView.heading.label', {
                  defaultMessage: 'Analyze data',
                })}{' '}
              <EuiBetaBadge
                style={{
                  verticalAlign: `middle`,
                }}
                label={i18n.translate('xpack.observability.expView.heading.experimental', {
                  defaultMessage: 'Experimental',
                })}
              />
            </h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="lensApp"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            onClick={() => {
              if (lensAttributes) {
                lens.navigateToPrefilledEditor(
                  {
                    id: '',
                    timeRange,
                    attributes: lensAttributes,
                  },
                  {
                    openInNewTab: true,
                  }
                );
              }
            }}
          >
            {i18n.translate('xpack.observability.expView.heading.openInLens', {
              defaultMessage: 'Open in Lens',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="save"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            onClick={() => {
              if (lensAttributes) {
                setIsSaveOpen(true);
              }
            }}
          >
            {i18n.translate('xpack.observability.expView.heading.saveLensVisualization', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isSaveOpen && lensAttributes && (
        <LensSaveModalComponent
          initialInput={(lensAttributes as unknown) as LensEmbeddableInput}
          onClose={() => setIsSaveOpen(false)}
          onSave={() => {}}
        />
      )}
    </>
  );
}
