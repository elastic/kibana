/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { KqlQueryLanguage } from '../../../../../../../../../common/api/detection_engine';
import { getQueryLanguageLabel } from '../../../../helpers';

interface ThreatLanguageReadOnlyProps {
  threatLanguage?: KqlQueryLanguage;
}

export function ThreatLanguageReadOnly({ threatLanguage }: ThreatLanguageReadOnlyProps) {
  if (!threatLanguage) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.THREAT_QUERY_LANGUAGE_LABEL,
          description: getQueryLanguageLabel(threatLanguage),
        },
      ]}
    />
  );
}
