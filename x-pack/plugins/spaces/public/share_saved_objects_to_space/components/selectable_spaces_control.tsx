/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './selectable_spaces_control.scss';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NoSpacesAvailable } from './no_spaces_available';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { DocumentationLinksService } from '../../lib';
import { SpaceAvatar } from '../../space_avatar';
import { SpaceData } from '../../types';
import { useSpaces } from '../../spaces_context';

interface Props {
  spaces: SpaceData[];
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
  enableCreateNewSpaceLink: boolean;
  enableSpaceAgnosticBehavior: boolean;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

const ROW_HEIGHT = 40;
const APPEND_ACTIVE_SPACE = <EuiBadge color="hollow">Current</EuiBadge>;
const APPEND_CANNOT_SELECT = (
  <EuiIconTip
    content={i18n.translate(
      'xpack.spaces.management.shareToSpace.partiallyAuthorizedSpaceTooltip.unchecked',
      { defaultMessage: 'You need additional privileges to select this space.' }
    )}
    position="left"
    type="iInCircle"
  />
);
const APPEND_CANNOT_DESELECT = (
  <EuiIconTip
    content={i18n.translate(
      'xpack.spaces.management.shareToSpace.partiallyAuthorizedSpaceTooltip.checked',
      { defaultMessage: 'You need additional privileges to deselect this space.' }
    )}
    position="left"
    type="iInCircle"
  />
);
const APPEND_FEATURE_IS_DISABLED = (
  <EuiIconTip
    content={i18n.translate('xpack.spaces.management.shareToSpace.featureIsDisabledTooltip', {
      defaultMessage:
        'This feature is disabled in this space, it will have no effect unless the feature is enabled again.',
    })}
    position="left"
    type="alert"
    color="warning"
  />
);

export const SelectableSpacesControl = (props: Props) => {
  const {
    spaces,
    selectedSpaceIds,
    onChange,
    enableCreateNewSpaceLink,
    enableSpaceAgnosticBehavior,
  } = props;
  const { services } = useSpaces();
  const { application, docLinks } = services;

  const activeSpaceId =
    !enableSpaceAgnosticBehavior && spaces.find((space) => space.isActiveSpace)!.id;
  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);
  const options = spaces
    .filter(({ id, isFeatureDisabled }) => !isFeatureDisabled || selectedSpaceIds.includes(id)) // filter out spaces that are not already selected and have the feature disabled in that space
    .sort(createSpacesComparator(activeSpaceId))
    .map<SpaceOption>((space) => {
      const checked = selectedSpaceIds.includes(space.id);
      const additionalProps = getAdditionalProps(space, activeSpaceId, checked);
      return {
        label: space.name,
        prepend: <SpaceAvatar space={space} size={'s'} />,
        checked: checked ? 'on' : undefined,
        ['data-space-id']: space.id,
        ['data-test-subj']: `sts-space-selector-row-${space.id}`,
        ...(isGlobalControlChecked && { disabled: true }),
        ...additionalProps,
      };
    });

  function updateSelectedSpaces(spaceOptions: SpaceOption[]) {
    const selectedOptions = spaceOptions
      .filter((x) => x.checked && x['data-space-id'] !== activeSpaceId)
      .map((x) => x['data-space-id']);
    const updatedSpaceIds = [
      ...selectedOptions,
      ...selectedSpaceIds.filter((x) => x === UNKNOWN_SPACE), // preserve any unknown spaces (to keep the "selected spaces" count accurate)
    ];

    onChange(updatedSpaceIds);
  }

  const getUnknownSpacesLabel = () => {
    const count = selectedSpaceIds.filter((id) => id === UNKNOWN_SPACE).length;
    if (!count) {
      return null;
    }

    const kibanaPrivilegesUrl = new DocumentationLinksService(
      docLinks!
    ).getKibanaPrivilegesDocUrl();
    return (
      <>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.unknownSpacesLabel.text"
            defaultMessage="To view hidden spaces, you need {additionalPrivilegesLink}."
            values={{
              additionalPrivilegesLink: (
                <EuiLink href={kibanaPrivilegesUrl}>
                  <FormattedMessage
                    id="xpack.spaces.management.shareToSpace.unknownSpacesLabel.additionalPrivilegesLink"
                    defaultMessage="additional privileges"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </>
    );
  };
  const getNoSpacesAvailable = () => {
    if (enableCreateNewSpaceLink && spaces.length < 2) {
      return <NoSpacesAvailable application={application!} />;
    }
    return null;
  };

  // if space-agnostic behavior is not enabled, the active space is not selected or deselected by the user, so we have to artifically pad the count for this label
  const selectedCountPad = enableSpaceAgnosticBehavior ? 0 : 1;
  const selectedCount =
    selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID && id !== UNKNOWN_SPACE).length +
    selectedCountPad;
  const hiddenCount = selectedSpaceIds.filter((id) => id === UNKNOWN_SPACE).length;
  const selectSpacesLabel = i18n.translate(
    'xpack.spaces.management.shareToSpace.shareModeControl.selectSpacesLabel',
    { defaultMessage: 'Select spaces' }
  );
  const selectedSpacesLabel = i18n.translate(
    'xpack.spaces.management.shareToSpace.shareModeControl.selectedCountLabel',
    { defaultMessage: '{selectedCount} selected', values: { selectedCount } }
  );
  const hiddenSpacesLabel = i18n.translate(
    'xpack.spaces.management.shareToSpace.shareModeControl.hiddenCountLabel',
    { defaultMessage: '+{hiddenCount} hidden', values: { hiddenCount } }
  );
  const hiddenSpaces = hiddenCount ? <EuiText size="xs">{hiddenSpacesLabel}</EuiText> : null;
  return (
    <EuiFormRow
      label={selectSpacesLabel}
      labelAppend={
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{selectedSpacesLabel}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{hiddenSpaces}</EuiFlexItem>
        </EuiFlexGroup>
      }
      fullWidth
    >
      <>
        <EuiSelectable
          options={options}
          onChange={(newOptions) => updateSelectedSpaces(newOptions as SpaceOption[])}
          listProps={{
            bordered: true,
            rowHeight: ROW_HEIGHT,
            className: 'spcShareToSpace__spacesList',
            'data-test-subj': 'sts-form-space-selector',
          }}
          height={ROW_HEIGHT * 3.5}
          searchable={options.length > 6}
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
        {getUnknownSpacesLabel()}
        {getNoSpacesAvailable()}
      </>
    </EuiFormRow>
  );
};

/**
 * Gets additional props for the selection option.
 */
function getAdditionalProps(space: SpaceData, activeSpaceId: string | false, checked: boolean) {
  if (space.id === activeSpaceId) {
    return {
      append: APPEND_ACTIVE_SPACE,
      disabled: true,
      checked: 'on' as 'on',
    };
  } else if (space.isPartiallyAuthorized) {
    return {
      append: (
        <>
          {checked ? APPEND_CANNOT_DESELECT : APPEND_CANNOT_SELECT}
          {space.isFeatureDisabled ? APPEND_FEATURE_IS_DISABLED : null}
        </>
      ),
      disabled: true,
    };
  } else if (space.isFeatureDisabled) {
    return {
      append: APPEND_FEATURE_IS_DISABLED,
    };
  }
}

/**
 * Given the active space, create a comparator to sort a SpaceData array so that the active space is at the beginning, and space(s) for
 * which the current feature is disabled are all at the end.
 */
function createSpacesComparator(activeSpaceId: string | false) {
  return (a: SpaceData, b: SpaceData) => {
    if (a.id === activeSpaceId) {
      return -1;
    } else if (b.id === activeSpaceId) {
      return 1;
    } else if (a.isFeatureDisabled !== b.isFeatureDisabled) {
      return a.isFeatureDisabled ? 1 : -1;
    }
    return 0;
  };
}
