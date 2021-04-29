/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { DataViewLabels } from '../configurations/constants';
import { useUrlStorage } from '../hooks/use_url_storage';

interface Props {
  seriesId: string;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ seriesId, lensAttributes }: Props) {
  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { series } = useUrlStorage(seriesId);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiText>
          <h2>
            {DataViewLabels[series.reportType] ??
              i18n.translate('xpack.observability.expView.heading.label', {
                defaultMessage: 'Exploratory view',
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
    </EuiFlexGroup>
  );
}
