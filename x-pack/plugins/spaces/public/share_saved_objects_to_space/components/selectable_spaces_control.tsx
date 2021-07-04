/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './selectable_spaces_control.scss';

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import React, { lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { DocumentationLinksService } from '../../lib';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { useSpaces } from '../../spaces_context';
import type { ShareToSpaceTarget } from '../../types';
import type { ShareOptions } from '../types';
import { NoSpacesAvailable } from './no_spaces_available';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spaces: ShareToSpaceTarget[];
  shareOptions: ShareOptions;
  onChange: (selectedSpaceIds: string[]) => void;
  enableCreateNewSpaceLink: boolean;
  enableSpaceAgnosticBehavior: boolean;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

const ROW_HEIGHT = 40;
const APPEND_ACTIVE_SPACE = (
  <EuiBadge color="hollow">
    {i18n.translate('xpack.spaces.shareToSpace.currentSpaceBadge', { defaultMessage: 'Current' })}
  </EuiBadge>
);
const APPEND_CANNOT_SELECT = (
  <EuiIconTip
    content={i18n.translate('xpack.spaces.shareToSpace.partiallyAuthorizedSpaceTooltip.unchecked', {
      defaultMessage: 'You need additional privileges to select this space.',
    })}
    position="left"
    type="iInCircle"
  />
);
const APPEND_CANNOT_DESELECT = (
  <EuiIconTip
    content={i18n.translate('xpack.spaces.shareToSpace.partiallyAuthorizedSpaceTooltip.checked', {
      defaultMessage: 'You need additional privileges to deselect this space.',
    })}
    position="left"
    type="iInCircle"
  />
);
const APPEND_FEATURE_IS_DISABLED = (
  <EuiIconTip
    content={i18n.translate('xpack.spaces.shareToSpace.featureIsDisabledTooltip', {
      defaultMessage: 'This feature is disabled in this space.',
    })}
    position="left"
    type="alert"
    color="warning"
  />
);

export const SelectableSpacesControl = (props: Props) => {
  const {
    spaces,
    shareOptions,
    onChange,
    enableCreateNewSpaceLink,
    enableSpaceAgnosticBehavior,
  } = props;
  const { services } = useSpaces();
  const { application, docLinks } = services;
  const { selectedSpaceIds, initiallySelectedSpaceIds } = shareOptions;

  const activeSpaceId =
    !enableSpaceAgnosticBehavior && spaces.find((space) => space.isActiveSpace)!.id;
  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);
  const options = spaces
    .filter(
      // filter out spaces that are not already selected and have the feature disabled in that space
      ({ id, isFeatureDisabled }) => !isFeatureDisabled || initiallySelectedSpaceIds.includes(id)
    )
    .sort(createSpacesComparator(activeSpaceId))
    .map<SpaceOption>((space) => {
      const checked = selectedSpaceIds.includes(space.id);
      const { isAvatarDisabled, ...additionalProps } = getAdditionalProps(
        space,
        activeSpaceId,
        checked
      );
      return {
        label: space.name,
        prepend: <LazySpaceAvatar space={space} isDisabled={isAvatarDisabled} size={'s'} />, // wrapped in a Suspense below
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
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.spaces.shareToSpace.unknownSpacesLabel.text"
            defaultMessage="To view hidden spaces, you need {additionalPrivilegesLink}."
            values={{
              additionalPrivilegesLink: (
                <EuiLink href={kibanaPrivilegesUrl} target="_blank">
                  <FormattedMessage
                    id="xpack.spaces.shareToSpace.unknownSpacesLabel.additionalPrivilegesLink"
                    defaultMessage="additional privileges"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    );
  };
  const getNoSpacesAvailable = () => {
    if (enableCreateNewSpaceLink && spaces.length < 2) {
      return (
        <EuiFlexItem grow={false}>
          <NoSpacesAvailable application={application!} />
        </EuiFlexItem>
      );
    }
    return null;
  };

  // if space-agnostic behavior is not enabled, the active space is not selected or deselected by the user, so we have to artificially pad the count for this label
  const selectedCountPad = enableSpaceAgnosticBehavior ? 0 : 1;
  const selectedCount =
    selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID && id !== UNKNOWN_SPACE).length +
    selectedCountPad;
  const hiddenCount = selectedSpaceIds.filter((id) => id === UNKNOWN_SPACE).length;
  const selectSpacesLabel = i18n.translate(
    'xpack.spaces.shareToSpace.shareModeControl.selectSpacesLabel',
    { defaultMessage: 'Select spaces' }
  );
  const selectedSpacesLabel = i18n.translate(
    'xpack.spaces.shareToSpace.shareModeControl.selectedCountLabel',
    { defaultMessage: '{selectedCount} selected', values: { selectedCount } }
  );
  const hiddenSpacesLabel = i18n.translate(
    'xpack.spaces.shareToSpace.shareModeControl.hiddenCountLabel',
    { defaultMessage: '+{hiddenCount} hidden', values: { hiddenCount } }
  );
  const hiddenSpaces = hiddenCount ? <EuiText size="xs">{hiddenSpacesLabel}</EuiText> : null;
  return (
    <>
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
        <></>
      </EuiFormRow>

      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <Suspense fallback={<EuiLoadingSpinner />}>
            <EuiSelectable
              options={options}
              onChange={(newOptions) => updateSelectedSpaces(newOptions as SpaceOption[])}
              listProps={{
                bordered: true,
                rowHeight: ROW_HEIGHT,
                className: 'spcShareToSpace__spacesList',
                'data-test-subj': 'sts-form-space-selector',
              }}
              height="full"
              searchable={options.length > SPACE_SEARCH_COUNT_THRESHOLD}
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
          </Suspense>
        </EuiFlexItem>
        {getUnknownSpacesLabel()}
        {getNoSpacesAvailable()}
      </EuiFlexGroup>
    </>
  );
};

/**
 * Gets additional props for the selection option.
 */
function getAdditionalProps(
  space: ShareToSpaceTarget,
  activeSpaceId: string | false,
  checked: boolean
) {
  if (space.id === activeSpaceId) {
    return {
      append: APPEND_ACTIVE_SPACE,
      disabled: true,
      checked: 'on' as 'on',
    };
  }
  if (space.cannotShareToSpace) {
    return {
      append: (
        <>
          {checked ? APPEND_CANNOT_DESELECT : APPEND_CANNOT_SELECT}
          {space.isFeatureDisabled ? APPEND_FEATURE_IS_DISABLED : null}
        </>
      ),
      disabled: true,
    };
  }
  if (space.isFeatureDisabled) {
    return {
      append: APPEND_FEATURE_IS_DISABLED,
      isAvatarDisabled: true,
    };
  }
  return {};
}

/**
 * Given the active space, create a comparator to sort a ShareToSpaceTarget array so that the active space is at the beginning, and space(s) for
 * which the current feature is disabled are all at the end.
 */
function createSpacesComparator(activeSpaceId: string | false) {
  return (a: ShareToSpaceTarget, b: ShareToSpaceTarget) => {
    if (a.id === activeSpaceId) {
      return -1;
    }
    if (b.id === activeSpaceId) {
      return 1;
    }
    if (a.isFeatureDisabled !== b.isFeatureDisabled) {
      return a.isFeatureDisabled ? 1 : -1;
    }
    return 0;
  };
}
