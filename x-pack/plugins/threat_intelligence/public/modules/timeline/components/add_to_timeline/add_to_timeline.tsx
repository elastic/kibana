/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, VFC } from 'react';
import { DataProvider } from '@kbn/timelines-plugin/common';
import { AddToTimelineButtonProps } from '@kbn/timelines-plugin/public';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui/src/components/button';
import { EuiContextMenuItem, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { generateDataProvider } from '../../utils/data_provider';
import { ComponentType } from '../../../../../common/types/component_type';
import {
  fieldAndValueValid,
  getIndicatorFieldAndValue,
} from '../../../indicators/utils/field_value';
import { useKibana } from '../../../../hooks/use_kibana';
import { Indicator } from '../../../../../common/types/indicator';
import { useStyles } from './styles';

export interface AddToTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value passed to the timeline.
   */
  field: string;
  /**
   * Dictates the way the FilterIn component is rendered depending on the situation in which it's used
   */
  type?: ComponentType;
  /**
   * Only used with `EuiDataGrid` (see {@link AddToTimelineButtonProps}).
   */
  as?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Add to timeline button, used in many places throughout the TI plugin.
 * Support being passed a {@link Indicator} or a string, can be used in a `EuiDataGrid` or as a normal button.
 * Leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * The component has 2 renders depending on where it's used: within a EuiContextMenu or not.
 *
 * @returns add to timeline button or an empty component.
 */
export const AddToTimeline: VFC<AddToTimelineProps> = ({ data, field, type, as, ...props }) => {
  const styles = useStyles();

  const contextMenuRef = useRef<HTMLButtonElement>(null);

  const addToTimelineButton =
    useKibana().services.timelines.getHoverActions().getAddToTimelineButton;

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  if (!fieldAndValueValid(key, value)) {
    return <></>;
  }

  const dataProvider: DataProvider[] = [generateDataProvider(key, value as string)];

  const addToTimelineProps: AddToTimelineButtonProps = {
    dataProvider,
    field: key,
    ownFocus: false,
  };

  // Use case is for the barchart legend (for example).
  // We can't use the addToTimelineButton directly because the UI doesn't work in a EuiContextMenu.
  // We hide it and use the defaultFocusedButtonRef props to programmatically click it.
  if (type === ComponentType.ContextMenu) {
    addToTimelineProps.defaultFocusedButtonRef = contextMenuRef;

    return (
      <>
        <div css={styles.displayNone}>{addToTimelineButton(addToTimelineProps)}</div>
        <EuiContextMenuItem
          key="addToTimeline"
          icon="timeline"
          size="s"
          onClick={() => contextMenuRef.current?.click()}
          {...props}
        >
          <FormattedMessage
            id="xpack.threatIntelligence.addToTimelineContextMenu"
            defaultMessage="Add to Timeline"
          />
        </EuiContextMenuItem>
      </>
    );
  }

  if (as) addToTimelineProps.Component = as;

  return (
    <EuiToolTip
      content={i18n.translate('xpack.threatIntelligence.addToTimelineIconButton', {
        defaultMessage: 'Add to Timeline',
      })}
    >
      <EuiFlexItem {...props}>{addToTimelineButton(addToTimelineProps)}</EuiFlexItem>
    </EuiToolTip>
  );
};
