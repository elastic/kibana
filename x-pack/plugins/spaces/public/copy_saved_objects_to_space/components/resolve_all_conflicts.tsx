/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './resolve_all_conflicts.scss';

import { EuiContextMenuItem, EuiContextMenuPanel, EuiLink, EuiPopover } from '@elastic/eui';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';

export interface ResolveAllConflictsProps {
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  onDestinationMapChange: (value?: Map<string, string>) => void;
}

interface State {
  isPopoverOpen: boolean;
}

interface ResolveOption {
  id: 'overwrite' | 'skip';
  text: string;
}

const options: ResolveOption[] = [
  {
    id: 'overwrite',
    text: i18n.translate('xpack.spaces.management.copyToSpace.overwriteAllConflictsText', {
      defaultMessage: 'Overwrite all',
    }),
  },
  {
    id: 'skip',
    text: i18n.translate('xpack.spaces.management.copyToSpace.skipAllConflictsText', {
      defaultMessage: 'Skip all',
    }),
  },
];

export class ResolveAllConflicts extends Component<ResolveAllConflictsProps, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const button = (
      <EuiLink onClick={this.onButtonClick} className={'spcCopyToSpace__resolveAllConflictsLink'}>
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.resolveAllConflictsLink"
          defaultMessage="(resolve all)"
        />
      </EuiLink>
    );

    const items = options.map((item) => {
      return (
        <EuiContextMenuItem
          data-test-subj={`cts-resolve-all-conflicts-${item.id}`}
          key={item.id}
          onClick={() => {
            this.onSelect(item.id);
          }}
        >
          {item.text}
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiPopover
        id={'resolveAllConflictsVisibilityPopover'}
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }

  private onSelect = (selection: ResolveOption['id']) => {
    const { summarizedCopyResult, retries, onRetriesChange, onDestinationMapChange } = this.props;
    const overwrite = selection === 'overwrite';

    if (overwrite) {
      const existingOverwrites = retries.filter((retry) => retry.overwrite === true);
      const newOverwrites = summarizedCopyResult.objects.reduce((acc, { type, id, conflict }) => {
        if (
          conflict &&
          !existingOverwrites.some((retry) => retry.type === type && retry.id === id)
        ) {
          const { error } = conflict;
          // if this is a regular conflict, use its destinationId if it has one;
          // otherwise, this is an ambiguous conflict, so use the first destinationId available
          const destinationId =
            error.type === 'conflict' ? error.destinationId : error.destinations[0].id;
          return [...acc, { type, id, overwrite, ...(destinationId && { destinationId }) }];
        }
        return acc;
      }, new Array<ImportRetry>());
      onRetriesChange([...retries, ...newOverwrites]);
    } else {
      const objectsToSkip = summarizedCopyResult.objects.reduce(
        (acc, { type, id, conflict }) => (conflict ? acc.add(`${type}:${id}`) : acc),
        new Set<string>()
      );
      const filtered = retries.filter(({ type, id }) => !objectsToSkip.has(`${type}:${id}`));
      onRetriesChange(filtered);
      onDestinationMapChange(undefined);
    }

    this.setState({ isPopoverOpen: false });
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}
