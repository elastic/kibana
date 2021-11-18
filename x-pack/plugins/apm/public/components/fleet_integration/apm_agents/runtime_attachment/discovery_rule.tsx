import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiBadge,
  EuiPanel,
  DraggableProvidedDragHandleProps,
} from '@elastic/eui';
import React from 'react';

interface Props {
  id: string;
  order: number;
  include: boolean;
  ruleKey: string;
  ruleValue: string;
  providedDragHandleProps?: DraggableProvidedDragHandleProps;
  onDelete: (discoveryItemId: string) => void;
  onEdit: (discoveryItemId: null | string) => void;
}

export function DiscoveryRule({
  id,
  order,
  include,
  ruleKey,
  ruleValue,
  providedDragHandleProps,
  onDelete,
  onEdit,
}: Props) {
  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <div {...providedDragHandleProps} aria-label="Drag Handle">
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiBadge>{order}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {include ? (
                <EuiBadge color="success">Include</EuiBadge>
              ) : (
                <EuiBadge color="danger">Exclude</EuiBadge>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h4>{ruleKey}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>{ruleValue}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="pencil"
                    color="primary"
                    onClick={() => {
                      onEdit(id);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="trash"
                    color="danger"
                    onClick={() => {
                      onDelete(id);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
