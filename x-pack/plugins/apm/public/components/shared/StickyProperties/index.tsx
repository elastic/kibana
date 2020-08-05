/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import {
  fontFamilyCode,
  fontSizes,
  px,
  truncate,
  units,
} from '../../../style/variables';

export interface IStickyProperty {
  val: JSX.Element | string | Date;
  label: string;
  fieldName?: string;
  width?: 0 | string;
  truncated?: boolean;
}

const TooltipFieldName = styled.span`
  font-family: ${fontFamilyCode};
`;

const PropertyLabel = styled.div`
  margin-bottom: ${px(units.half)};
  font-size: ${fontSizes.small};
  color: ${({ theme }) => theme.eui.euiColorMediumShade};

  span {
    cursor: help;
  }
`;
PropertyLabel.displayName = 'PropertyLabel';

const propertyValueLineHeight = 1.2;
const PropertyValue = styled.div`
  display: inline-block;
  line-height: ${propertyValueLineHeight};
`;
PropertyValue.displayName = 'PropertyValue';

const PropertyValueTruncated = styled.span`
  display: inline-block;
  line-height: ${propertyValueLineHeight};
  ${truncate('100%')};
`;

function getPropertyLabel({ fieldName, label }: Partial<IStickyProperty>) {
  if (fieldName) {
    return (
      <PropertyLabel>
        <EuiToolTip content={<TooltipFieldName>{fieldName}</TooltipFieldName>}>
          <span>{label}</span>
        </EuiToolTip>
      </PropertyLabel>
    );
  }

  return <PropertyLabel>{label}</PropertyLabel>;
}

function getPropertyValue({
  val,
  truncated = false,
}: Partial<IStickyProperty>) {
  if (truncated) {
    return (
      <EuiToolTip content={String(val)}>
        <PropertyValueTruncated>{String(val)}</PropertyValueTruncated>
      </EuiToolTip>
    );
  }

  return <PropertyValue>{val}</PropertyValue>;
}

export function StickyProperties({
  stickyProperties,
}: {
  stickyProperties: IStickyProperty[];
}) {
  /**
   * Note: the padding and margin styles here are strange because
   * EUI flex groups and items have a default "gutter" applied that
   * won't allow percentage widths to line up correctly, so we have
   * to turn the gutter off with gutterSize: none. When we do that,
   * the top/bottom spacing *also* collapses, so we have to add
   * padding between each item without adding it to the outside of
   * the flex group itself.
   *
   * Hopefully we can make EUI handle this better and remove all this.
   */
  const itemStyles = {
    padding: '1em 1em 1em 0',
  };
  const groupStyles = {
    marginTop: '-1em',
    marginBottom: '-1em',
  };

  return (
    <EuiFlexGroup wrap={true} gutterSize="none" style={groupStyles}>
      {stickyProperties &&
        stickyProperties.map(({ width = 0, ...prop }, i) => {
          return (
            <EuiFlexItem
              key={i}
              style={{
                minWidth: width,
                ...itemStyles,
              }}
              grow={false}
            >
              {getPropertyLabel(prop)}
              {getPropertyValue(prop)}
            </EuiFlexItem>
          );
        })}
    </EuiFlexGroup>
  );
}
