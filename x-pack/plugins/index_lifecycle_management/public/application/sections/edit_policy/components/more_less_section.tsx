/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

interface Props {
  align?: 'left' | 'right';
}

export const MoreLessSection: FunctionComponent<Props> = ({ align = 'left', children }) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const buttonLabel = isContentVisible
    ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.lessButtonLabel', {
        defaultMessage: 'Less options',
      })
    : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.moreButtonLabel', {
        defaultMessage: 'More options',
      });

  return (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent={align === 'right' ? 'flexEnd' : 'flexStart'}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType={isContentVisible ? 'arrowUp' : 'arrowDown'}
            onClick={() => setIsContentVisible((prev) => !prev)}
          >
            {buttonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div style={{ display: isContentVisible ? 'block' : 'none' }}>{children}</div>
    </>
  );
};
