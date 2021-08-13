/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiColorPicker,
  EuiComboBox,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiStat,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { clone, isEqual } from 'lodash';
import { Group, ItemSingular, PartialGroup } from '../graph_visualization/cy_types';

import './stylings.scss';
import { getGroupContent, isCollapsedElement } from '../graph_visualization/cy_grouping';
import { getLayoutOptions } from '../graph_visualization/use_cytoscape';

const generateId = htmlIdGenerator();

interface FieldMeta {
  label: string;
  color: string;
}

export interface GraphPanelProps {
  selection: ItemSingular[];
  isLoading: boolean;
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  onExpand: (selection: ItemSingular[]) => void;
  fields: FieldMeta[];
  cy?: cytoscape.Core;
}

export const GraphPanel = ({
  selection,
  isLoading,
  groups,
  setGroups,
  fields,
  cy,
  onExpand,
}: GraphPanelProps) => {
  const tabs = [
    {
      id: 'info-id',
      name: 'Info',
      content: (
        <InfoTabContent
          selection={selection}
          cy={cy}
          updateItemLabel={(item, label) => item.data('label', label)}
        />
      ),
    },
    { id: 'filter-id', name: 'Filter', content: <div>Hello</div> },
    {
      id: 'group-id',
      name: 'Group',
      content: <GroupTabContent groups={groups} updateGroups={setGroups} fields={fields} />,
    },
  ];
  return (
    <section className="gphSidebar">
      <EuiForm>
        <EuiPanel hasShadow={false}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiStat title={cy?.nodes().length} description={'Nodes'} isLoading={isLoading} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={cy?.edges().length} description={'Edges'} isLoading={isLoading} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup wrap gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color={'primary'}
                onClick={() => cy?.layout(getLayoutOptions({ fit: true, randomize: true })).run()}
                iconType="snowflake"
                aria-label="Layout graph"
              >
                Layout
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color={'primary'}
                onClick={() => onExpand(selection)}
                iconType="logstashIf"
                aria-label="Expand selection"
                disabled={Boolean(
                  !selection.length || !selection.filter((el) => el.isNode()).length
                )}
              >
                Expand
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" expand />
        </EuiPanel>
      </EuiForm>
    </section>
  );
};

function InfoTabContent({
  selection,
  updateItemLabel,
  cy,
}: {
  selection: ItemSingular[];
  updateItemLabel: (item: ItemSingular, label: string) => void;
  cy?: cytoscape.Core;
}) {
  if (!selection.length) {
    return (
      <EuiEmptyPrompt
        iconType="outlierDetectionJob"
        iconColor="default"
        title={<h2>No selection</h2>}
        titleSize="xs"
        body={<p>Select a Node or Edge to show its information here</p>}
      />
    );
  }
  if (selection.length > 1) {
    return (
      <EuiPanel hasShadow={false}>
        <MultipleElementsContent elements={selection} />
      </EuiPanel>
    );
  }
  const [item] = selection;
  return (
    <EditableInfoContent
      data={item.data()}
      isNode={item.isNode()}
      isCollapsed={isCollapsedElement(item)}
      getGroupInfo={() => {
        return getGroupContent(cy, item);
      }}
      updateLabel={(newLabel) => updateItemLabel(item, newLabel)}
    />
  );
}

function MultipleElementsContent({ elements }: { elements: ItemSingular[] }) {
  const nodesSelected = elements.filter((el) => el.isNode());
  const edgesSelected = elements.filter((el) => !el.isNode());
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat title={nodesSelected.length} description={'Nodes'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={edgesSelected.length} description={'Edges'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText>Nodes:</EuiText>
      <EuiListGroup>
        {nodesSelected.map((node) => (
          <EuiListGroupItem
            key={node.data('label')}
            href="#"
            label={node.data('label')}
            color="text"
          />
        ))}
      </EuiListGroup>
    </>
  );
}

function EditableInfoContent({
  isNode,
  isCollapsed,
  data,
  getGroupInfo,
  updateLabel,
}: {
  isNode: boolean;
  isCollapsed: boolean;
  data: Record<string, string>;
  getGroupInfo: () => cytoscape.NodeCollection | cytoscape.EdgeCollection | undefined;
  updateLabel: (newLabel: string) => void;
}) {
  const [localLabel, setLabel] = useState(data.label);

  useEffect(() => {
    if (localLabel !== '') {
      updateLabel(localLabel);
    }
  }, [localLabel, updateLabel]);

  if (isNode) {
    const details = Object.keys(data)
      .filter((key) => key !== 'label' && key !== 'id' && typeof data[key] === 'string')
      .map((key) => ({ title: key, description: data[key] }));
    const extraDetails = !isCollapsed ? [] : [{ title: 'Is Group', description: 'Yes' }];
    const collapsedContent = isCollapsed ? getGroupInfo() : null;

    const term = ((data.data as unknown) as { term: string } | undefined)?.term;
    return (
      <EuiPanel hasShadow={false}>
        <EuiTitle size="s">
          <h3>
            {data.field}: {term ?? '(empty)'}
          </h3>
        </EuiTitle>
        <EuiFormRow label="Label" display="columnCompressed">
          <EuiFieldText
            placeholder={term}
            compressed
            value={localLabel ?? ''}
            onChange={(ev) => setLabel(ev.target.value)}
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList
              type="column"
              listItems={details.concat(extraDetails)}
              style={{ maxWidth: '400px' }}
            />
            {collapsedContent && <MultipleElementsContent elements={collapsedContent.toArray()} />}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
  return (
    <EuiPanel hasShadow={false}>
      <EuiTitle size="s">
        <h3>Edge</h3>
      </EuiTitle>
      <EuiFormRow label="Label" display="columnCompressed">
        <EuiFieldText
          placeholder="Input"
          compressed
          value={localLabel ?? data.doc_count}
          onChange={() => {}}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiDescriptionList
        type="column"
        listItems={Object.keys(data)
          .filter((key) => key !== 'label')
          .map((key) => ({ title: key, description: data[key] }))}
        style={{ maxWidth: '400px' }}
      />
    </EuiPanel>
  );
}

function GroupTabContent({
  groups,
  updateGroups,
  fields,
}: {
  groups: Group[];
  updateGroups: (groups: Group[]) => void;
  fields: Array<{ label: string; color: string }>;
}) {
  const [localGroups, setGroups] = useState<PartialGroup[]>(groups);
  const [isOpenByCreation, setIsOpenByCreation] = useState(false);

  useEffect(() => {
    if (!isEqual(localGroups, groups)) {
      if (areValidGroups(localGroups)) {
        updateGroups(localGroups);
      }
    }
  }, [groups, localGroups, updateGroups]);

  if (localGroups.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="createMultiMetricJob"
        iconColor="default"
        title={<h2>No group defined</h2>}
        titleSize="xs"
        body={<p>Define how fields should be grouped together</p>}
        actions={
          <EuiButton
            size="s"
            color="primary"
            fill
            onClick={() => {
              setGroups([...localGroups, { id: '' + (localGroups.length + 1), selected: [] }]);
              setIsOpenByCreation(true);
            }}
          >
            Add a group
          </EuiButton>
        }
      />
    );
  }
  const fieldsUsage = groups.reduce((memo, { selected }) => {
    for (const { label: field } of selected) {
      memo[field] = memo[field] || 0;
      memo[field] += 1;
    }
    return memo;
  }, {} as Record<string, number>);
  const fieldsColors = fields.reduce((memo, { label, color }) => {
    memo[label] = color;
    return memo;
  }, {} as Record<string, string>);
  const filteredFields = fields.filter(({ label }) => !fieldsUsage[label]);
  return (
    <EuiFormRow className="graph_groupEntries">
      <>
        {localGroups.map((group, i) => {
          return (
            <EuiPanel paddingSize="none" hasShadow={false} hasBorder className="graph_groupEntry">
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {group.color ? (
                    <EuiIcon
                      size="s"
                      className="graph_colorIndicator"
                      color={group.color}
                      type="stopFilled"
                      aria-label={`Color of this group: ${group.color}`}
                    />
                  ) : (
                    <EuiIcon
                      className="graph_colorIndicator"
                      size="s"
                      type="stopSlash"
                      aria-label={`No color assigned yet for this group`}
                    />
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <GroupPopover
                    filteredFields={filteredFields}
                    fieldsColors={fieldsColors}
                    initiallyOpen={i === localGroups.length - 1 && isOpenByCreation}
                    group={group}
                    setGroup={(newGroup: PartialGroup) => {
                      const newGroups = [...localGroups];
                      newGroups[i] = newGroup;
                      setGroups(newGroups);
                    }}
                    Button={({ onClick }: { onClick: MouseEventHandler }) => (
                      <EuiLink onClick={onClick} color={'text'} title={'Click to edit'}>
                        {group.title || 'No title'}
                      </EuiLink>
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconSize="s"
                    iconType="cross"
                    color="danger"
                    data-test-subj="lns-customBucketContainer-remove"
                    onClick={() => {
                      const newGroups = [...localGroups];
                      newGroups.splice(i, 1);
                      setGroups(newGroups);
                    }}
                    aria-label={'Remove group'}
                    title={'Remove group'}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          );
        })}
        <EuiButtonEmpty
          size="xs"
          iconType="plusInCircle"
          onClick={() => {
            setGroups([...localGroups, { id: generateId(), selected: [] }]);
            setIsOpenByCreation(true);
          }}
        >
          Add new group
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
}

function GroupPopover({
  Button,
  initiallyOpen,
  group,
  setGroup,
  filteredFields,
  fieldsColors,
}: {
  initiallyOpen: boolean;
  group: PartialGroup;
  setGroup: (group: PartialGroup) => void;
  filteredFields: FieldMeta[];
  fieldsColors: Record<string, string>;
  Button: React.FC<{ onClick: MouseEventHandler }>;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // set popover open on start to work around EUI bug
  useEffect(() => {
    setIsPopoverOpen(initiallyOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closePopover = () => {
    if (isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  };
  return (
    <EuiPopover
      anchorClassName="eui-fullWidth"
      isOpen={isPopoverOpen}
      ownFocus
      closePopover={() => closePopover()}
      button={
        <Button
          onClick={() => {
            setIsPopoverOpen((open) => !open);
          }}
        />
      }
    >
      <EuiFormRow label="Group name" display="columnCompressed">
        <EuiFieldText
          placeholder={group.selected[0]?.label ?? 'Group name'}
          compressed
          value={group.title}
          onChange={(ev) => {
            const newGroup = clone(group);
            newGroup.title = ev.target.value;
            setGroup(newGroup);
          }}
        />
      </EuiFormRow>
      <EuiFormRow label="Label" display="columnCompressed">
        <EuiComboBox
          placeholder="Pick one or more fields"
          options={filteredFields.concat(
            group.selected.map(({ label }) => ({ label, color: fieldsColors[label] }))
          )}
          selectedOptions={group.selected}
          onChange={(newSelection) => {
            const newGroup = clone(group);
            newGroup.selected = newSelection;
            setGroup(newGroup);
          }}
          isClearable={true}
          data-test-subj={`graph-group-box-${group.id}`}
        />
      </EuiFormRow>
      <EuiFormRow label="Color" display="columnCompressed">
        <EuiColorPicker
          onChange={(newColor) => {
            const newGroup = clone(group);
            newGroup.color = newColor;
            setGroup(newGroup);
          }}
          color={group.color}
          isInvalid={false}
        />
      </EuiFormRow>
    </EuiPopover>
  );
}

function areValidGroups(groups: PartialGroup[]): groups is Group[] {
  // all groups should have one or more fields
  const atLeastTwoFields = groups.every(
    ({ selected, title, color }) => selected?.length > 1 && title && color
  );
  // same field cannot be in two different groups
  const fieldsUsage = groups.reduce((memo, { selected }) => {
    for (const { label: field } of selected) {
      memo[field] = memo[field] || 0;
      memo[field] += 1;
    }
    return memo;
  }, {} as Record<string, number>);
  const noConflictingFields = Object.keys(fieldsUsage).every((field) => fieldsUsage[field] === 1);

  return atLeastTwoFields && noConflictingFields;
}
