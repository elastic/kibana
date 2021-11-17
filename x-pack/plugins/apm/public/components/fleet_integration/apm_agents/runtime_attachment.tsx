/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanel,
  EuiIcon,
  euiDragDropReorder,
  EuiBadge,
} from '@elastic/eui';
import React, { useState } from 'react';
// import {
//   NewPackagePolicy,
//   PackagePolicy,
//   PackagePolicyEditExtensionComponentProps,
// } from '../apm_policy_form/typings';

interface Props {
  // policy: PackagePolicy;
  // newPolicy: NewPackagePolicy;
  // onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

function DiscoveryRule({
  order,
  include,
  ruleKey,
  ruleValue,
}: {
  order: number;
  include: boolean;
  ruleKey: string;
  ruleValue: string;
}) {
  return (
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
              onClick={() => {}}
              style={{ cursor: 'pointer' }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="trash"
              color="danger"
              onClick={() => {}}
              style={{ cursor: 'pointer' }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function RuntimeAttachment({}: Props) {
  const [list, setList] = useState([
    {
      id: 'main java-opbeans-10010',
      content: {
        include: true,
        key: 'main',
        value: 'java-opbeans-10010',
      },
    },
    {
      id: 'pid 10948653898867',
      content: {
        include: false,
        key: 'pid',
        value: '10948653898867',
      },
    },
  ]);
  const onDragEnd = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(list, source.index, destination.index);

      setList(items);
    }
  };
  return (
    <div>
      <EuiCallOut
        title="This is an experimental feature so please use with caution and never in production environments."
        color="warning"
        iconType="beaker"
        size="s"
      />
      <EuiSpacer />
      <EuiSwitch
        label="Runtime attachment"
        checked={true}
        onChange={() => {}}
      />
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>Attach the Java agent to running and starting Java applications.</p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText size="s">
        <h3>Discovery rules</h3>
      </EuiText>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
        <EuiFlexItem>
          <EuiCallOut
            title="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs."
            color="euiColorGhost"
            iconType="iInCircle"
            size="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="plusInCircle">Add rule</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable
          droppableId="CUSTOM_HANDLE_DROPPABLE_AREA"
          spacing="m"
          withPanel
        >
          {list.map(({ content, id }, idx) => (
            <EuiDraggable
              spacing="m"
              key={id}
              index={idx}
              draggableId={id}
              customDragHandle={true}
            >
              {(provided) => (
                <EuiPanel
                  className="custom"
                  paddingSize="m"
                  color={content.include ? 'success' : 'danger'}
                >
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <div
                        {...provided.dragHandleProps}
                        aria-label="Drag Handle"
                      >
                        <EuiIcon type="grab" />
                      </div>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <DiscoveryRule
                        order={idx + 1}
                        include={content.include}
                        ruleKey={content.key}
                        ruleValue={content.value}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    </div>
  );
}
