/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput, LensEmbeddableInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { DataViewLabels } from '../configurations/constants';
import { ObservabilityAppServices } from '../../../../application/types';
import { useSeriesStorage } from '../hooks/use_series_storage';

interface Props {
  seriesId: string;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ seriesId, lensAttributes }: Props) {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const { lens } = kServices;

  const { getSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const LensSaveModalComponent = lens.SaveModalComponent;

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
                    timeRange: series.time,
                    attributes: lensAttributes,
                  },
                  true
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
          isVisible={isSaveOpen}
          initialInput={(lensAttributes as unknown) as LensEmbeddableInput}
          onClose={() => setIsSaveOpen(false)}
          onSave={() => {}}
        />
      )}
    </>
  );
}
