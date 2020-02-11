/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { builtInAggregationTypes } from '../../../../../../../triggers_actions_ui/public/common/constants';
import {
  WhenExpression,
  OfExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../triggers_actions_ui/public/common';

interface ExampleProps {
  testAggType?: string;
  testAggField?: string;
  errors: { [key: string]: string[] };
}

export const ExampleExpression: React.FunctionComponent<ExampleProps> = ({
  testAggType,
  testAggField,
  errors,
}) => {
  const [aggType, setAggType] = useState<string>('count');
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={testAggType ?? 'count'} // defult is 'count'
            onChangeSelectedAggType={(selectedAggType: string) => {
              // console.log(`Set alert type params field "aggType" value as ${selectedAggType}`);
              setAggType(selectedAggType);
            }}
          />
        </EuiFlexItem>
        {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <OfExpression
              aggField={testAggField}
              fields={[{ normalizedType: 'number', name: 'test' }]} // can be some data from server API
              aggType={aggType}
              errors={errors}
              onChangeSelectedAggField={(selectedAggField?: string) =>
                // console.log(`Set alert type params field "aggField" value as ${selectedAggField}`)
                setAggType('')
              }
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </Fragment>
  );
};
