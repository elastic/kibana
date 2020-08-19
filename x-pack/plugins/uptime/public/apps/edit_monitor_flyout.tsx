/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
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
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { getTags } from '../state/actions/tags';
import { tagSelector, centralManagementSelector } from '../state/selectors';
import { postMonitorConfig, hideEditMonitorFlyout } from '../state/actions/central_management';

interface EditMonitorFlyoutComponentProps {
  scheduleUnit?: 's' | 'm' | 'h';
  onClose: () => void;
  onSubmit: () => void;
  postMonitorConfig: () => void;
  tags: string[];
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

export const EditMonitorFlyout: React.FC = (props) => {
  const dispatch = useDispatch();
  const tagsState = useSelector(tagSelector);

  useEffect(() => {
    dispatch(getTags());
  }, [dispatch]);

  const centralManagement = useSelector(centralManagementSelector);

  if (!centralManagement.isEditFlyoutVisible) return null;

  return (
    <EditMonitorFlyoutComponent
      {...props}
      onClose={() => dispatch(hideEditMonitorFlyout())}
      onSubmit={() => ({})}
      postMonitorConfig={() => dispatch(postMonitorConfig())}
      tags={tagsState.tags}
    />
  );
};

export const EditMonitorFlyoutComponent: React.FC<EditMonitorFlyoutComponentProps> = (props) => {
  const [name, setName] = useState<string>('default-name');
  const [url, setUrl] = useState<string>('default-url');
  const [periodCount, setPeriodCount] = useState<string>('30');
  const [periodUnit, setPeriodUnit] = useState<string>(props.scheduleUnit ?? DEFAULT_UNIT_VALUE);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Array<EuiComboBoxOptionOption<unknown>>>([]);
  const isNameInvalid = checkName(name);
  const isUrlInvalid = checkUrl(url);
  const isPeriodCountInvalid = checkPeriodCount(periodCount);
  return (
    <EuiFlyout onClose={props.onClose}>
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
            <EuiText>
              <p>Advanced settings are supposed to go here.</p>
            </EuiText>
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
              isDisabled={isNameInvalid || isUrlInvalid || isPeriodCountInvalid}
              fill
              onClick={() => props.postMonitorConfig()}
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
