/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { HiddenText } from '../../../shared/hidden_text';

export const CredentialsList: React.FC<{}> = () => {
  return (
    <EuiBasicTable
      columns={[
        {
          name: 'Test',
          width: '12%',
          render: (item) => {
            return <div>{item.name}</div>;
          },
        },
        {
          name: 'Type',
          width: '18%',
          render: (item) => {
            return <div>{item.type}</div>;
          },
        },
        {
          name: 'Key',
          width: '43%',
          render: (item) => {
            return (
              <EuiCopy textToCopy={item.key} afterMessage="Copied">
                {(copy) => (
                  <HiddenText text={item.key}>
                    {({ hiddenText, isHidden, toggle }) => {
                      const icon = isHidden ? 'eye' : 'eyeClosed';
                      return (
                        <div>
                          <EuiButtonIcon onClick={() => copy()} iconType="copyClipboard" />
                          <EuiButtonIcon onClick={toggle} iconType={icon} />
                          {hiddenText}
                        </div>
                      );
                    }}
                  </HiddenText>
                )}
              </EuiCopy>
            );
          },
        },
        {
          name: 'Modes',
          width: '10%',
          render: (item) => {
            return <div>{item.modes}</div>;
          },
        },
        {
          name: 'Engines',
          width: '10%',
          render: (item) => {
            return <div>{item.engines}</div>;
          },
        },
        {
          width: '4%',
          render: (item) => {
            return (
              <EuiButtonIcon onClick={() => window.alert(`edit ${item.id}`)} iconType="pencil" />
            );
          },
        },
        {
          width: '4%',
          render: (item) => {
            return (
              <EuiButtonIcon onClick={() => window.alert(`delete ${item.id}`)} iconType="trash" />
            );
          },
        },
      ]}
      items={[
        {
          id: 'id',
          name: 'private-key',
          type: 'Private API Key',
          key: 'private-hdh25f2eozpsfttm47hjrch9',
          modes: 'read/write',
          engines: 'all',
        },
      ]}
    />
  );
};
