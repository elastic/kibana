/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import { EuiCodeBlock, EuiHighlight, EuiAvatar, EuiSelectable, EuiFlexItem } from '@elastic/eui';
import type { EuiMarkdownEditorUiPlugin, EuiSelectableProps } from '@elastic/eui';
import { ID } from './constants';
import { useGetUsers } from './use_get_users';

const MentionsEditorComponent: EuiMarkdownEditorUiPlugin['editor'] = (props) => {
  const { node, onSave, onCancel } = props;
  const selectableRef = useRef<EuiSelectable>(null);
  const { userList } = useGetUsers();

  const onChange: EuiSelectableProps['onChange'] = (options) => {
    for (let i = 0; i < options.length; i++) {
      if (options[i].checked) {
        onSave(`@${options[i].label} `, { block: false });
        return;
      }
    }
  };

  const renderOption = (option, searchValue) => {
    return (
      <EuiFlexItem>
        <span>
          <EuiAvatar name={option.label} size="s" />

          <span
            css={css`
              margin-left: 8px;
            `}
          >
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          </span>
        </span>
      </EuiFlexItem>
    );
  };

  return (
    <EuiSelectable
      ref={selectableRef}
      options={userList}
      onChange={onChange}
      height={300}
      renderOption={renderOption}
      listProps={{
        showIcons: false,
        rowHeight: 36,
      }}
    >
      {(list) => list}
    </EuiSelectable>
  );
};

MentionsEditorComponent.displayName = 'MentionsEditorComponent';

export const MentionsEditor = React.memo(MentionsEditorComponent);

export const plugin = {
  name: ID,
  button: {
    label: 'Mention',
    iconType: 'userAvatar',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'@someone'}
    </EuiCodeBlock>
  ),
  editor: MentionsEditor,
};
