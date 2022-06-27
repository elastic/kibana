import React, { useState } from 'react';
import { EuiButtonIcon, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiToolTip } from '@elastic/eui';
// @ts-ignore
import { htmlIdGenerator } from '@elastic/eui/lib/services';

import { ActionProps, MetaDataProps, ResultFieldProps } from './types';
import { ResultHeader } from './result_header';
import { ResultFields } from './result_fields';

interface ResultProps {
  actions: ActionProps[];
  metaData: MetaDataProps;
  fields: ResultFieldProps[];
  isCheckable?: boolean;
  isDraggable?: boolean;
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
      {fields.length <= 3 ? (
        'All fields are visible'
      ) : (
        `Show ${fields.length - 3} ${isExpanded ? 'fewer' : 'more'} fields`
      )}
    </>
  )

  return (
    <EuiPanel hasBorder paddingSize="none" className={`${isChecked && 'result__selected'}`}>
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
              <ResultHeader
                title="A very well-written title"
                actions={actions}
                metaData={metaData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <ResultFields fields={isExpanded ? fields : fields.slice(0, 3)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div className="resultExpandColumn">
            <EuiToolTip
              position="left"
              content={toolTipContent}>
              <EuiButtonIcon
                disabled={fields.length <= 3}
                iconType={isExpanded ? 'fold' : 'unfold'}
                color="text"
                onClick={() => setIsExpanded(!isExpanded)}/>
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
}
