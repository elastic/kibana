/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  visualizationLabel: string;
}

export function ViewInMaps(props: Props) {
  return (
    <EuiCallOut
      data-test-subj="deprecatedVisInfo"
      size="s"
      title={i18n.translate('xpack.maps.legacyVisualizations.title', {
        defaultMessage: '{label} has transitioned to Maps.',
        values: { label: props.visualizationLabel },
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.maps.legacyVisualizations.editMessage"
          defaultMessage="Maps has replaced {label}. To edit, convert to Maps."
          values={{ label: props.visualizationLabel }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.maps.legacyVisualizations.useMapsMsg"
          defaultMessage="With Maps, you can add multiple layers and indices, plot individual documents, symbolize features from data values, add heatmaps, grids, and clusters, and more."
        />
      </p>
      <div>
        <EuiButton onClick={props.onClick} size="s">
          <FormattedMessage
            id="xpack.maps.legacyVisualizations.openInMapsButtonLabel"
            defaultMessage="View in Maps"
          />
        </EuiButton>
      </div>
    </EuiCallOut>
  );
}
