import React, { FunctionComponent } from 'react';

import { EuiIcon, IconType } from '@elastic/eui';

export interface OperationSummaryProps {
  iconType?: IconType;
  operation?: string;
  field?: string;
}

export const OperationSummary: FunctionComponent<OperationSummaryProps
> = ({ iconType, operation, field }) => {

  let iconNode;
  if (iconType) {
    iconNode = <EuiIcon type={iconType} className="lnsConfigPanel__summaryIcon" />
  }

  let operationNode;
  if (operation) {
    operationNode = (
      <>
        <strong className="lnsConfigPanel__summaryOperation">{operation}</strong> of{' '}
      </>
    )
  }

  let fieldNode;
  if (field) {
    fieldNode = (<strong className="lnsConfigPanel__summaryField">{field}</strong>);
  }

  return (
    <>
      {iconNode}
      <span>
        {operationNode}
        {fieldNode}
      </span>
    </>
  );
};
