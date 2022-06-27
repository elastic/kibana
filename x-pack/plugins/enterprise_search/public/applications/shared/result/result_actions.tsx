import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { ActionProps } from './types';

interface SingleAction {
  action: ActionProps;
}

interface Props {
  actions: ActionProps[];
}

const LinkAction: React.FC<SingleAction> = ({ action }) => (
  <EuiButtonEmpty
    className="resultActionButton"
    flush="both" style={{ fontWeight: 700 }}
    size="xs"
    // @ts-ignore
    color={action.color || 'primary'}
    iconType={action.iconType}>
    {action.label}
  </EuiButtonEmpty>
)

// Maybe allow users to pass hrefs as well as an onClick and have the dom render either a button or a link
const TextAction: React.FC<SingleAction> = ({ action }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    {action.iconType && (
      <EuiFlexItem grow={false}>
        <EuiIcon type={action.iconType} color={action.color || 'default'} />
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color={action.color || 'default' }>
        <strong>
          {action.label}
        </strong>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
)

export const ResultActions: React.FC<Props> = ({
  actions
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {actions.map((action: ActionProps) => (
        <EuiFlexItem grow={false}>
          {action.onClick ? (
            <LinkAction action={action} />
          ) : (
            <TextAction action={action} />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
}
