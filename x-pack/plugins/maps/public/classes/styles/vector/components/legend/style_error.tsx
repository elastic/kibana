/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DynamicStyleProperty } from '../../properties/dynamic_style_property';

interface Props {
  error: Error;
  style: DynamicStyleProperty<object>;
}

export const StyleError = ({ error, style }: Props) => {
  const [label, setLabel] = useState('');
  const styleName = style.getDisplayStyleName();

  useEffect(() => {
    let canceled = false;
    const getLabel = async () => {
      const field = style.getField();
      if (!field) {
        return;
      }

      const fieldLabel = await field.getLabel();

      if (canceled) {
        return;
      }

      setLabel(fieldLabel);
    };

    getLabel();

    return () => {
      canceled = true;
    };
  }, [style]);

  return (
    <div>
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" title={styleName} content={label}>
            <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
              <small>
                <strong>{label}</strong>
              </small>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiCallOut
          title={i18n.translate('xpack.maps.vectorStyleLegend.fetchStyleMetaDataError', {
            defaultMessage: 'Unable to fetch style meta data',
          })}
          color="warning"
          iconType="warning"
        >
          <p>{error.message}</p>
        </EuiCallOut>
      </EuiFlexGroup>
    </div>
  );
};
