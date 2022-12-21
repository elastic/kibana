/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { documentationService } from '../../../services/documentation';

export const MultipleMappingsWarning = () => (
  <EuiCallOut
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.mappingTypesDetectedCallOutTitle', {
      defaultMessage: 'Mapping types detected',
    })}
    iconType="alert"
    color="warning"
    data-test-subj="mappingTypesDetectedCallout"
  >
    <p>
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.mappingTypesDetectedCallOutDescription"
        defaultMessage="The mappings for this template uses types, which have been removed. {docsLink}"
        values={{
          docsLink: (
            <EuiLink href={documentationService.getAlternativeToMappingTypesLink()} target="_blank">
              {i18n.translate(
                'xpack.idxMgmt.mappingsEditor.mappingTypesDetectedCallOutDocumentationLink',
                {
                  defaultMessage: 'Consider these alternatives to mapping types.',
                }
              )}
            </EuiLink>
          ),
        }}
      />
    </p>
  </EuiCallOut>
);
