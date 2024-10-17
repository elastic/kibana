/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import type { FormSchema } from '../../../../../../../../shared_imports';
import { UseMultiFields } from '../../../../../../../../shared_imports';
import type { RuleFieldComponentProps } from '../../field_component_props';
import { IndexPatternEdit } from './index_pattern_edit';
import { DataSourceInfoText } from './data_source_info_text';
import { DataViewEdit } from './data_view_edit';
import { DataSourceTypeSelectorField } from './data_source_type_selector_field';

export const dataSourceSchema = {
  type: {
    default: DataSourceType.index_patterns,
  },
  index_patterns: schema.index,
  data_view_id: schema.dataViewId,
} as FormSchema<{
  type: string;
  index_patterns: string[];
  data_view_id: string;
}>;

export function DataSourceEdit({ resetForm }: RuleFieldComponentProps): JSX.Element {
  return (
    <UseMultiFields<{
      type: string;
      indexPatterns: string[] | undefined;
      dataViewId: string | undefined;
    }>
      fields={{
        type: {
          path: 'type',
        },
        indexPatterns: {
          path: 'index_patterns',
        },
        dataViewId: {
          path: 'data_view_id',
        },
      }}
    >
      {({ type, indexPatterns, dataViewId }) => (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <DataSourceInfoText />
          </EuiFlexItem>
          <EuiFlexItem>
            <DataSourceTypeSelectorField field={type} resetForm={resetForm} />
          </EuiFlexItem>
          <EuiFlexItem>
            <TabContent visible={type.value === DataSourceType.index_patterns}>
              <IndexPatternEdit key="index-patterns" field={indexPatterns} />
            </TabContent>
            <TabContent visible={type.value === DataSourceType.data_view}>
              <DataViewEdit key="data-view" field={dataViewId} />
            </TabContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </UseMultiFields>
  );
}

interface TabProps {
  visible: boolean;
}

const hidden = css`
  display: none;
`;

function TabContent({ visible, children }: PropsWithChildren<TabProps>): JSX.Element {
  return <div className={!visible ? hidden : undefined}>{children}</div>;
}
