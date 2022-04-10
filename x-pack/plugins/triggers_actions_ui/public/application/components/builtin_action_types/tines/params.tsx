/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelectable,
  EuiSpacer,
  EuiSelectableOption,
} from '@elastic/eui';

import { ActionParamsProps } from '../../../../types';
import { Stories, TinesParams } from './types';
import { useSubAction } from '../../../hooks/use_sub_action';

const TinesParamsFields: React.FunctionComponent<ActionParamsProps<TinesParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const [storyId, setStoryId] = useState<string | null>(null);

  const { response: stories } = useSubAction<Stories[]>({
    connectorId: actionConnector?.id ?? '',
    subAction: 'stories',
    subActionParams: {},
  });

  const storiesOptions = (stories ?? []).map((story) => ({ label: story.name, value: story.id }));

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSelectable
            aria-label="Stories"
            searchable
            singleSelection={true}
            options={storiesOptions}
            onChange={(newOptions) => setStoryId(newOptions[0].value)}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TinesParamsFields as default };
