/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import { Query } from '../../../../rule_definition_section';
import type { RuleEsqlQuery } from '../../../../../../../../../common/api/detection_engine';

interface EsqlQueryReadonlyProps {
  esqlQuery: RuleEsqlQuery;
}

export function EsqlQueryReadOnly({ esqlQuery }: EsqlQueryReadonlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: descriptionStepI18n.ESQL_QUERY_LABEL,
          description: <Query query={esqlQuery.query} />,
        },
      ]}
    />
  );
}
