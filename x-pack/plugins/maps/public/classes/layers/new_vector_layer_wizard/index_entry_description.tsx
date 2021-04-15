/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function IndexEntryDescription() {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.maps.layers.newVectorLayerWizard.indexSettings.indexNameGuidelines',
        {
          defaultMessage: 'Index name guidelines',
        }
      )}
      size="s"
    >
      <ul style={{ marginBottom: 0 }}>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.mustBeNewIndex',
            {
              defaultMessage: 'Must be a new index',
            }
          )}
        </li>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.lowercaseOnly',
            {
              defaultMessage: 'Lowercase only',
            }
          )}
        </li>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.cannotInclude',
            {
              defaultMessage:
                'Cannot include \\\\, /, *, ?, ", <, >, |, \
            " " (space character), , (comma), #',
            }
          )}
        </li>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.cannotStartWith',
            {
              defaultMessage: 'Cannot start with -, _, +',
            }
          )}
        </li>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.cannotBe',
            {
              defaultMessage: 'Cannot be . or ..',
            }
          )}
        </li>
        <li>
          {i18n.translate(
            'xpack.maps.layers.newVectorLayerWizard.indexSettings.guidelines.length',
            {
              defaultMessage:
                'Cannot be longer than 255 bytes (note it is bytes, \
            so multi-byte characters will count towards the 255 \
            limit faster)',
            }
          )}
        </li>
      </ul>
    </EuiCallOut>
  );
}
