/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { DocumentationLinksService } from '../../lib';
import { SpaceAvatar } from '../../space_avatar';
import { SpaceTarget } from '../types';

interface Props {
  spaces: SpaceTarget[];
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

const ROW_HEIGHT = 40;
const partiallyAuthorizedTooltip = {
  checked: i18n.translate(
    'xpack.spaces.management.shareToSpace.partiallyAuthorizedSpaceTooltip.checked',
    { defaultMessage: 'You need additional privileges to deselect this space.' }
  ),
  unchecked: i18n.translate(
    'xpack.spaces.management.shareToSpace.partiallyAuthorizedSpaceTooltip.unchecked',
    { defaultMessage: 'You need additional privileges to select this space.' }
  ),
};
const partiallyAuthorizedSpaceProps = (checked: boolean) => ({
  append: (
    <EuiIconTip
      content={checked ? partiallyAuthorizedTooltip.checked : partiallyAuthorizedTooltip.unchecked}
      position="left"
      type="iInCircle"
    />
  ),
  disabled: true,
});
const activeSpaceProps = {
  append: <EuiBadge color="hollow">Current</EuiBadge>,
  disabled: true,
  checked: 'on' as 'on',
};

export const SelectableSpacesControl = (props: Props) => {
  const { spaces, selectedSpaceIds, onChange } = props;
  const { services } = useKibana();
  const { application, docLinks } = services;

  const activeSpaceId = spaces.find((space) => space.isActiveSpace)!.id;
  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);
  const options = spaces
    .sort((a, b) => (a.isActiveSpace ? -1 : b.isActiveSpace ? 1 : 0))
    .map<SpaceOption>((space) => {
      const checked = selectedSpaceIds.includes(space.id);
      return {
        label: space.name,
        prepend: <SpaceAvatar space={space} size={'s'} />,
        checked: checked ? 'on' : undefined,
        ['data-space-id']: space.id,
        ['data-test-subj']: `sts-space-selector-row-${space.id}`,
        ...(isGlobalControlChecked && { disabled: true }),
        ...(space.isPartiallyAuthorized && partiallyAuthorizedSpaceProps(checked)),
        ...(space.isActiveSpace && activeSpaceProps),
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
    if (spaces.length < 2) {
      return <NoSpacesAvailable application={application!} />;
    }
    return null;
  };

  const selectedCount =
    selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID && id !== UNKNOWN_SPACE).length + 1;
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
        {getUnknownSpacesLabel()}
        {getNoSpacesAvailable()}
      </>
    </EuiFormRow>
  );
};
