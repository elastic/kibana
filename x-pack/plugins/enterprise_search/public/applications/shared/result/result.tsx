/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';

// @ts-ignore
import { htmlIdGenerator } from '@elastic/eui/lib/services';

import { ResultFields } from './result_fields';
import { ResultHeader } from './result_header';

import { ActionProps, MetaDataProps, ResultFieldProps } from './types';

interface ResultProps {
  actions: ActionProps[];
  fields: ResultFieldProps[];
  isCheckable?: boolean;
  isDraggable?: boolean;
  metaData: MetaDataProps;
}

export const Result: React.FC<ResultProps> = ({
  actions,
  metaData,
  fields,
  isCheckable,
  isDraggable,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [showLeftColumn] = useState(isCheckable || isDraggable);

  const toolTipContent = (
    <>
      {fields.length <= 3
        ? 'All fields are visible'
        : `Show ${fields.length - 3} ${isExpanded ? 'fewer' : 'more'} fields`}
    </>
  );

  return (
    <EuiPanel hasBorder paddingSize="s" className={`${isChecked && 'result__selected'}`}>
      <EuiFlexGroup gutterSize="none">
        {showLeftColumn && (
          <EuiFlexItem grow={false}>
            <div className="resultCheckDragColumn">
              {isCheckable ? (
                <EuiCheckbox
                  id={htmlIdGenerator()()}
                  checked={isChecked}
                  onChange={() => setIsChecked(!isChecked)}
                />
              ) : (
                <div className="resultCheckDragColumn__emptySpace" />
              )}
              {isDraggable ? (
                <EuiButtonIcon
                  iconType="grab"
                  color="text"
                  onClick={() => console.log('Drag it')}
                />
              ) : (
                <div className="resultCheckDragColumn__emptySpace" />
              )}
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <ResultHeader title={metaData.id} actions={actions} metaData={metaData} />
            </EuiFlexItem>
            <EuiFlexItem>
              <ResultFields
                isExpanded={isExpanded}
                fields={isExpanded ? fields : fields.slice(0, 3)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div className="resultExpandColumn">
            <EuiToolTip position="left" content={toolTipContent}>
              <EuiButtonIcon
                iconType={isExpanded ? 'fold' : 'unfold'}
                color="text"
                onClick={() => setIsExpanded(!isExpanded)}
              />
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
