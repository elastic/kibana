/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiTableActionsColumnType,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { isRight } from 'fp-ts/lib/Either';
import {
  SloRule,
  useFetchSLOsWithBurnRateRules,
} from '../../hooks/slo/use_fetch_slos_with_burn_rate_rules';
import { Dependency, DependencyRT } from '../../../common/typings';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../common/constants';

const ACTION_GROUP_OPTIONS = [
  { value: ALERT_ACTION.id, label: ALERT_ACTION.name },
  { value: HIGH_PRIORITY_ACTION.id, label: HIGH_PRIORITY_ACTION.name },
  { value: MEDIUM_PRIORITY_ACTION.id, label: MEDIUM_PRIORITY_ACTION.name },
  { value: LOW_PRIORITY_ACTION.id, label: LOW_PRIORITY_ACTION.name },
];

interface DependencyEditorProps {
  isLoading: boolean;
  onSubmit: (dependency: Dependency) => void;
  dependency?: Dependency;
  rules?: Array<Rule<SloRule>>;
}

function DependencyEditor({ isLoading, onSubmit, dependency, rules }: DependencyEditorProps) {
  const isEditMode = dependency != null;
  const [isOpen, setPopoverState] = useState(false);

  const [partialDependency, setPartialDependency] = useState<Partial<Dependency>>(dependency || {});

  const handleOpenPopover = () => setPopoverState(true);
  const handleClosePopover = () => {
    if (!isEditMode) {
      setPartialDependency({});
    }
    setPopoverState(false);
  };

  const handleRuleSelection = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    if (opts.length > 0 && opts[0].value) {
      setPartialDependency((previous) => ({ ...previous, ruleId: opts[0].value }));
    }
  };

  const handleActionGroupSelection = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    if (opts.length > 0 && opts.every((opt) => !!opt.value)) {
      const values = opts.map((opt) => opt.value);
      setPartialDependency((previous) => ({
        ...previous,
        actionGroupsToSuppressOn: values as string[],
      }));
    }
  };

  const rulesOptions = rules?.map((rule) => ({ label: rule.name, value: rule.id })) ?? [];
  const selectedRuleOption = rulesOptions?.filter((opt) => opt.value === partialDependency.ruleId);
  const selectedRule = rules?.find((rule) => rule.id === partialDependency.ruleId);
  const ruleActionGroups =
    (selectedRule && selectedRule.params.windows.map((winDef) => winDef.actionGroup)) || [];
  const actionGroupOptions = ACTION_GROUP_OPTIONS.filter((group) =>
    ruleActionGroups.includes(group.value)
  );
  const selectedActionGroups = ACTION_GROUP_OPTIONS.filter((group) =>
    partialDependency.actionGroupsToSuppressOn?.includes(group.value)
  );

  const handleSubmit = () => {
    const dep = DependencyRT.decode(partialDependency);
    if (isRight(dep)) {
      onSubmit(dep.right);
    }
    handleClosePopover();
  };

  const button = isEditMode ? (
    <EuiButtonIcon
      isDisabled={isLoading}
      data-test-subj="sloBurnRateRuleEditDependencyButton"
      color={'primary'}
      size="s"
      iconType={'pencil'}
      onClick={handleOpenPopover}
      aria-label={i18n.translate('xpack.observability.slo.rules.editDependencyAriaLabel', {
        defaultMessage: 'Edit dependency',
      })}
    />
  ) : (
    <EuiButtonEmpty
      isDisabled={isLoading || rules?.length === 0}
      data-test-subj="sloBurnRateRuleAddDependencyButton"
      color={'primary'}
      size="s"
      iconType={'plusInCircleFilled'}
      onClick={handleOpenPopover}
      aria-label={i18n.translate('xpack.observability.slo.rules.addDependencyAriaLabel', {
        defaultMessage: 'Add dependency',
      })}
    >
      <FormattedMessage
        id="xpack.observability.slo.rules.addDependencyLabel"
        defaultMessage="Add dependency"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={handleSubmit}>
      <div style={{ width: 400 }}>
        <EuiForm component="form">
          <EuiFormRow
            label={i18n.translate('xpack.observability.slo.rules.addDependencyForm.ruleLabel', {
              defaultMessage: 'Rule (required)',
            })}
          >
            <EuiComboBox
              compressed
              fullWidth
              options={rulesOptions}
              singleSelection={{ asPlainText: true }}
              isLoading={isLoading}
              onChange={handleRuleSelection}
              selectedOptions={selectedRuleOption}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability.slo.rules.addDependencyForm.suppressOnLabel',
              {
                defaultMessage: 'Suppress on (required)',
              }
            )}
          >
            <EuiComboBox
              compressed
              fullWidth
              isDisabled={!partialDependency.ruleId}
              options={actionGroupOptions}
              onChange={handleActionGroupSelection}
              selectedOptions={selectedActionGroups}
            />
          </EuiFormRow>
        </EuiForm>
      </div>
    </EuiPopover>
  );
}

interface DependenciesProps {
  currentRuleId?: string;
  dependencies: Dependency[];
  onChange: (depencencies: Dependency[]) => void;
}

interface DependencyTableRow {
  index: number;
  dependency: Dependency;
  actionGroupsToSuppressOn: string[];
}

export function Dependencies({ currentRuleId, dependencies, onChange }: DependenciesProps) {
  const { isLoading, data } = useFetchSLOsWithBurnRateRules({});

  const dependencyRuleIds = dependencies.map((dep) => dep.ruleId);
  const rules = currentRuleId
    ? data?.filter((rule) => rule.id !== currentRuleId && !dependencyRuleIds.includes(rule.id))
    : data;

  const handleAddDependency = (dependency: Dependency) => {
    onChange([...dependencies, dependency]);
  };

  const handleChange = (index: number, dependency: Dependency) => {
    onChange(dependencies.map((dep, idx) => (idx === index ? dependency : dep)));
  };

  const handleDelete = (index: number) => {
    onChange(dependencies.filter((_dep, idx) => idx !== index));
  };

  const rows = dependencies.map((dependency, index) => {
    const rule = data?.find(({ id }) => id === dependency.ruleId);
    return {
      index,
      name: rule?.name,
      actionGroupsToSuppressOn: dependency.actionGroupsToSuppressOn,
      dependency,
    };
  });

  const columns = [
    {
      field: 'name',
      truncateText: true,
      name: i18n.translate('xpack.observability.slo.rules.dependencies.ruleColumn', {
        defaultMessage: 'Rule',
      }),
    },
    {
      field: 'actionGroupsToSuppressOn',
      name: i18n.translate('xpack.observability.slo.rules.dependencies.supressOnColumn', {
        defaultMessage: 'Suppress on',
      }),
      render: (groups: string[]) => {
        return groups.map((group) => {
          const actionGroup = ACTION_GROUP_OPTIONS.find((g) => g.value === group);
          return <EuiBadge color="hollow">{actionGroup?.label}</EuiBadge>;
        });
      },
    },
    {
      width: '50px',
      actions: [
        {
          render: (row: DependencyTableRow) => {
            const handleSubmit = (dep: Dependency) => {
              handleChange(row.index, dep);
            };
            return (
              <DependencyEditor
                isLoading={isLoading}
                onSubmit={handleSubmit}
                dependency={row.dependency}
                rules={rules}
              />
            );
          },
        },
        {
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          name: 'Delete',
          description: 'Delete dependency',
          onClick: (row: DependencyTableRow) => {
            handleDelete(row.index);
          },
        },
      ],
    } as EuiTableActionsColumnType<DependencyTableRow>,
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.observability.slo.rules.dependencies.title', {
            defaultMessage: 'Rule dependencies',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.observability.slo.rules.dependencies.description', {
            defaultMessage:
              'Configure rule dependencies and designate the serverity action groups you want to use to suppress the current rule. For instance, if you choose to suppress on the "Critical" and "High" action groups, the current rule will abstain from executing any actions of its severity groups when the associated rule dependency breaches its threshold. Instead, it will execute a "Suppressed" action group in response to the dependency trigger.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable columns={columns} items={rows} />
      <EuiSpacer size="s" />
      <DependencyEditor rules={rules} isLoading={isLoading} onSubmit={handleAddDependency} />
      <EuiSpacer size="m" />
    </>
  );
}
