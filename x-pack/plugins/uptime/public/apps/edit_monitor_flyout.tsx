/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSelect,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { getTags } from '../state/actions/tags';
import { tagSelector, centralManagementSelector } from '../state/selectors';
import {
  postMonitorConfig,
  hideEditMonitorFlyout,
  getImAgentPolicies,
  PostPackagePolicyParams,
  getImAgentPolicyDetail,
} from '../state/actions/central_management';
import { CentralManagementState } from '../state/reducers/central_management';
import { CENTRAL_CONFIG } from '../../common/constants';
import { AgentPolicy } from '../../../ingest_manager/common';

interface EditMonitorFlyoutComponentProps {
  centralManagement: CentralManagementState;
  onClose: () => void;
  onSubmit: () => void;
  postMonitorConfig: (params: PostPackagePolicyParams) => void;
  scheduleUnit?: 's' | 'm' | 'h';
  tags: string[];
  updateAgentPolicyDetails: (policyId: string) => void;
}

const DEFAULT_UNIT_VALUE = 's';
const periodUnitOptions = [
  { value: 's', text: 'Seconds' },
  { value: 'm', text: 'Minutes' },
  { value: 'h', text: 'Hours' },
];

const checkName = (name: string) => !name;
const checkUrl = (url: string) => !url;
const checkPeriodCount = (count: string) => {
  const nCount = Number(count);
  return isNaN(nCount) || nCount <= 0 || !Number.isInteger(nCount);
};

// TODO: lazy load
export const EditMonitorFlyout: React.FC = (props) => {
  const dispatch = useDispatch();
  const tagsState = useSelector(tagSelector);

  useEffect(() => {
    dispatch(getTags());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getImAgentPolicies());
  }, [dispatch]);

  const centralManagement = useSelector(centralManagementSelector);
  const { isEditFlyoutVisible } = centralManagement;

  const updateAgentPolicyDetails = useCallback(
    (policyId: string) => dispatch(getImAgentPolicyDetail(policyId)),
    [dispatch]
  );

  if (!isEditFlyoutVisible) return null;

  return (
    <EditMonitorFlyoutComponent
      {...props}
      centralManagement={centralManagement}
      onClose={() => dispatch(hideEditMonitorFlyout())}
      onSubmit={() => ({})}
      postMonitorConfig={(params: PostPackagePolicyParams) => dispatch(postMonitorConfig(params))}
      tags={tagsState.tags}
      updateAgentPolicyDetails={updateAgentPolicyDetails}
    />
  );
};

const getDefaultPackageName = (existingNames?: string[]) => {
  let packageName: string;
  let count = 0;
  do {
    count += 1;
    packageName = `${CENTRAL_CONFIG.PACKAGE_NAME}-${count}`;
  } while (existingNames && existingNames.indexOf(packageName) >= 0);
  return packageName;
};

const checkPackageName = (packageName: string | undefined, agentPolicy?: AgentPolicy): boolean =>
  !!packageName &&
  !!agentPolicy &&
  !!agentPolicy.package_policies.find((policy) => policy.name === packageName);

export const EditMonitorFlyoutComponent: React.FC<EditMonitorFlyoutComponentProps> = (props) => {
  const { centralManagement } = props;
  const { updateAgentPolicyDetails } = props;
  const { agentPolicyDetail } = centralManagement;
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [periodCount, setPeriodCount] = useState<string>('30');
  const [periodUnit, setPeriodUnit] = useState<string>(props.scheduleUnit ?? DEFAULT_UNIT_VALUE);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Array<EuiComboBoxOptionOption<unknown>>>([]);
  const [selectedAgentPolicy, setSelectedAgentPolicy] = useState<string | undefined>(undefined);
  const [packagePolicyName, setPackagePolicyName] = useState<string | undefined>();
  const isNameInvalid = checkName(name);
  const isUrlInvalid = checkUrl(url);
  const isPeriodCountInvalid = checkPeriodCount(periodCount);
  const isPackageNameInvalid = checkPackageName(packagePolicyName, agentPolicyDetail);

  useEffect(() => {
    if (selectedAgentPolicy) {
      updateAgentPolicyDetails(selectedAgentPolicy);
    }
  }, [updateAgentPolicyDetails, selectedAgentPolicy]);

  // FIXME: this causes the text field component to go from an uncontrolled to a controlled state
  // and React outputs a warning
  useEffect(() => {
    if (!packagePolicyName && agentPolicyDetail) {
      setPackagePolicyName(
        getDefaultPackageName(agentPolicyDetail.package_policies.map(({ name }) => name))
      );
    }
  }, [agentPolicyDetail, packagePolicyName, setPackagePolicyName]);

  return (
    <EuiFlyout aria-labelledby="Edit monitor flyout" onClose={props.onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle>
          <h2 id="uptime-central-management-flyout-title">Edit monitor</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow fullWidth={true} label="Name">
            <EuiFieldText
              fullWidth={true}
              isInvalid={isNameInvalid}
              name="name"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth={true} label="URL">
            <EuiFieldText
              fullWidth={true}
              isInvalid={isUrlInvalid}
              name="url"
              onChange={(e) => setUrl(e.target.value)}
              value={url}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth={true} label="Ping every">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldText
                  fullWidth={true}
                  name="periodCount"
                  isInvalid={isPeriodCountInvalid}
                  onChange={(e) => setPeriodCount(e.target.value)}
                  value={periodCount}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  options={periodUnitOptions}
                  onChange={(e) => setPeriodUnit(e.target.value)}
                  value={periodUnit}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiFormRow fullWidth={true} label="Tags">
            <EuiComboBox
              customOptionText="Add {searchValue} as a new tag."
              fullWidth={true}
              options={customTags.concat(props.tags).map((tag) => ({ label: tag }))}
              onChange={(e) => setSelectedTags(e)}
              onCreateOption={(search) => {
                const sanitized = search.trim().toLowerCase();
                if (!sanitized) return;
                setCustomTags([...customTags, sanitized]);
                setSelectedTags(selectedTags.concat({ label: sanitized }));
              }}
              selectedOptions={selectedTags}
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiAccordion
            id="uptime-central-management-advanced"
            buttonContent={<EuiTextColor color="secondary">Advanced options</EuiTextColor>}
          >
            <EuiSpacer size="l" />
            <AgentPolicySelect
              centralManagement={centralManagement}
              selectedAgentPolicy={selectedAgentPolicy}
              setSelectedAgentPolicy={setSelectedAgentPolicy}
            />
            {/* TODO: provide error message when package name is already taken. */}
            <EuiFormRow fullWidth={true} label="Package policy name">
              <EuiFieldText
                fullWidth={true}
                name="packagePolicyName"
                isInvalid={isPackageNameInvalid}
                onChange={(e) => setPackagePolicyName(e.target.value)}
                value={packagePolicyName}
              />
            </EuiFormRow>
          </EuiAccordion>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={props.onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={
                isNameInvalid ||
                isUrlInvalid ||
                isPeriodCountInvalid ||
                isPackageNameInvalid ||
                !selectedAgentPolicy
              }
              fill
              onClick={() =>
                props.postMonitorConfig({
                  agentPolicyId: selectedAgentPolicy!,
                  packagePolicyName,
                  name,
                  schedule: periodCount + periodUnit,
                  url,
                })
              }
              type="submit"
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

interface AgentPolicySelectProps {
  centralManagement: Pick<
    CentralManagementState,
    'agentPolicyError' | 'agentPolicyPage' | 'loadingAgentPolicies'
  >;
  selectedAgentPolicy: string | undefined;
  setSelectedAgentPolicy: Dispatch<SetStateAction<string | undefined>>;
}

const AgentPolicySelect = (props: AgentPolicySelectProps) => {
  const { selectedAgentPolicy, setSelectedAgentPolicy } = props;
  const { agentPolicyPage, loadingAgentPolicies } = props.centralManagement;
  const policyError = props.centralManagement?.agentPolicyError;
  const options =
    agentPolicyPage?.items.map((policy) => ({
      value: policy.id,
      text: policy.name,
    })) ?? [];

  useEffect(() => {
    if (!loadingAgentPolicies && selectedAgentPolicy === undefined && options.length) {
      // TODO: default this more intelligently
      setSelectedAgentPolicy(options[0].value);
    }
  }, [options, selectedAgentPolicy, setSelectedAgentPolicy, loadingAgentPolicies]);

  return (
    <EuiFormRow fullWidth={true} label="Agent policy">
      <>
        {policyError && (
          <EuiCallOut color="danger" iconType="cross" title="Error loading policies">
            {policyError.message}
          </EuiCallOut>
        )}
        <EuiSelect
          disabled={!!policyError || (!loadingAgentPolicies && !options.length)}
          fullWidth
          isLoading={loadingAgentPolicies}
          id="agentPolicySelect"
          options={options}
          value={selectedAgentPolicy}
          onChange={(e) => setSelectedAgentPolicy(e.target.value)}
        />
      </>
    </EuiFormRow>
  );
};
