/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';
import { useBasePath } from '../../lib/kibana';
import { patternColors } from './helpers';

export const ColorKey = ({ includeDetections = false }: { includeDetections?: boolean }) => (
  <EuiText color="subdued">
    <p>
      <small>
        <FormattedMessage
          id="xpack.securitySolution.indexPatterns.colorKey"
          defaultMessage="Green indicates a {kip}. Only one Kibana Index Pattern can be selected at a time. White indicates a {config}, which can be defined in {link} and can be selected in multiples. "
          values={{
            kip: <EuiBadge color={patternColors.kip}>{i18n.KIBANA_INDEX_PATTERN}</EuiBadge>,
            config: <EuiBadge color={'hollow'}>{i18n.CONFIG_INDEX_PATTERN}</EuiBadge>,
            link: (
              <EuiButtonEmpty
                href={`${useBasePath()}/app/management/kibana/settings?query=category:(securitySolution)`}
                iconSide="right"
                iconType="popout"
                size="xs"
                target="_blank"
              >
                {i18n.ADVANCED_SETTINGS}
              </EuiButtonEmpty>
            ),
          }}
        />
        {includeDetections && (
          <FormattedMessage
            id="xpack.securitySolution.indexPatterns.detections"
            defaultMessage="Orange indicates the {detections}."
            values={{
              detections: (
                <EuiBadge color={patternColors.detections}>{i18n.SIEM_SIGNALS_INDEX}</EuiBadge>
              ),
            }}
          />
        )}
      </small>
    </p>
  </EuiText>
);
