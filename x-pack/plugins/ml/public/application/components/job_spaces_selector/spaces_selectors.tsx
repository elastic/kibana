/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableOption,
  EuiIconTip,
  EuiText,
  EuiCheckableCard,
  EuiFormFieldset,
} from '@elastic/eui';

import { SpaceAvatar } from '../../../../../spaces/public';
import { useSpacesContext } from '../../contexts/spaces';
import { ML_SAVED_OBJECT_TYPE } from '../../../../common/types/saved_objects';
import { ALL_SPACES_ID } from '../job_spaces_list';
import { CannotEditCallout } from './cannot_edit_callout';

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

interface Props {
  jobId: string;
  spaceIds: string[];
  setSelectedSpaceIds: (ids: string[]) => void;
  selectedSpaceIds: string[];
  canEditSpaces: boolean;
  setCanEditSpaces: (canEditSpaces: boolean) => void;
}

export const SpacesSelector: FC<Props> = ({
  jobId,
  spaceIds,
  setSelectedSpaceIds,
  selectedSpaceIds,
  canEditSpaces,
  setCanEditSpaces,
}) => {
  const { spacesManager, allSpaces } = useSpacesContext();

  const [canShareToAllSpaces, setCanShareToAllSpaces] = useState(false);

  useEffect(() => {
    const getPermissions = spacesManager.getShareSavedObjectPermissions(ML_SAVED_OBJECT_TYPE);
    Promise.all([getPermissions]).then(([{ shareToAllSpaces }]) => {
      setCanShareToAllSpaces(shareToAllSpaces);
      setCanEditSpaces(shareToAllSpaces || spaceIds.includes(ALL_SPACES_ID) === false);
    });
  }, []);

  function toggleShareOption(isAllSpaces: boolean) {
    const updatedSpaceIds = isAllSpaces
      ? [ALL_SPACES_ID, ...selectedSpaceIds]
      : selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID);
    setSelectedSpaceIds(updatedSpaceIds);
  }

  function updateSelectedSpaces(selectedOptions: SpaceOption[]) {
    const ids = selectedOptions.filter((opt) => opt.checked).map((opt) => opt['data-space-id']);
    setSelectedSpaceIds(ids);
  }

  const isGlobalControlChecked = useMemo(() => selectedSpaceIds.includes(ALL_SPACES_ID), [
    selectedSpaceIds,
  ]);

  const options = useMemo(
    () =>
      allSpaces.map<SpaceOption>((space) => {
        return {
          label: space.name,
          prepend: <SpaceAvatar space={space} size={'s'} />,
          checked: selectedSpaceIds.includes(space.id) ? 'on' : undefined,
          disabled: canEditSpaces === false,
          ['data-space-id']: space.id,
          ['data-test-subj']: `cts-space-selector-row-${space.id}`,
        };
      }),
    [allSpaces, selectedSpaceIds, canEditSpaces]
  );

  const shareToAllSpaces = useMemo(
    () => ({
      id: 'shareToAllSpaces',
      title: i18n.translate('xpack.ml.management.spacesSelectorFlyout.shareToAllSpaces.title', {
        defaultMessage: 'All spaces',
      }),
      text: i18n.translate('xpack.ml.management.spacesSelectorFlyout.shareToAllSpaces.text', {
        defaultMessage: 'Make job available in all current and future spaces.',
      }),
      ...(!canShareToAllSpaces && {
        tooltip: isGlobalControlChecked
          ? i18n.translate(
              'xpack.ml.management.spacesSelectorFlyout.shareToAllSpaces.cannotUncheckTooltip',
              { defaultMessage: 'You need additional privileges to change this option.' }
            )
          : i18n.translate(
              'xpack.ml.management.spacesSelectorFlyout.shareToAllSpaces.cannotCheckTooltip',
              { defaultMessage: 'You need additional privileges to use this option.' }
            ),
      }),
      disabled: !canShareToAllSpaces,
    }),
    [isGlobalControlChecked, canShareToAllSpaces]
  );

  const shareToExplicitSpaces = useMemo(
    () => ({
      id: 'shareToExplicitSpaces',
      title: i18n.translate(
        'xpack.ml.management.spacesSelectorFlyout.shareToExplicitSpaces.title',
        {
          defaultMessage: 'Select spaces',
        }
      ),
      text: i18n.translate('xpack.ml.management.spacesSelectorFlyout.shareToExplicitSpaces.text', {
        defaultMessage: 'Make job available in selected spaces only.',
      }),
      disabled: !canShareToAllSpaces && isGlobalControlChecked,
    }),
    [canShareToAllSpaces, isGlobalControlChecked]
  );

  return (
    <>
      {canEditSpaces === false && <CannotEditCallout jobId={jobId} />}
      <EuiFormFieldset>
        <EuiCheckableCard
          id={shareToExplicitSpaces.id}
          label={createLabel(shareToExplicitSpaces)}
          checked={!isGlobalControlChecked}
          onChange={() => toggleShareOption(false)}
          disabled={shareToExplicitSpaces.disabled}
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.management.spacesSelectorFlyout.selectSpacesLabel"
                defaultMessage="Select spaces"
              />
            }
            fullWidth
          >
            <EuiSelectable
              options={options}
              onChange={(newOptions) => updateSelectedSpaces(newOptions as SpaceOption[])}
              listProps={{
                bordered: true,
                rowHeight: 40,
                className: 'spcCopyToSpace__spacesList',
                'data-test-subj': 'cts-form-space-selector',
              }}
              searchable
            >
              {(list, search) => {
                return (
                  <>
                    {search}
                    {list}
                  </>
                );
              }}
            </EuiSelectable>
          </EuiFormRow>
        </EuiCheckableCard>

        <EuiSpacer size="s" />

        <EuiCheckableCard
          id={shareToAllSpaces.id}
          label={createLabel(shareToAllSpaces)}
          checked={isGlobalControlChecked}
          onChange={() => toggleShareOption(true)}
          disabled={shareToAllSpaces.disabled}
        />
      </EuiFormFieldset>
    </>
  );
};

function createLabel({
  title,
  text,
  disabled,
  tooltip,
}: {
  title: string;
  text: string;
  disabled: boolean;
  tooltip?: string;
}) {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>{title}</EuiText>
        </EuiFlexItem>
        {tooltip && (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={tooltip} position="left" type="iInCircle" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText color={disabled ? undefined : 'subdued'} size="s">
        {text}
      </EuiText>
    </>
  );
}
