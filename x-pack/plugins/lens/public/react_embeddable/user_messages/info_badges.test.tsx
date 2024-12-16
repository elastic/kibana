/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { EmbeddableFeatureBadge } from './info_badges';
import { UserMessage } from '../../types';

describe('EmbeddableFeatureBadge', () => {
  async function renderPopup(messages: UserMessage[], count: number = messages.length) {
    render(<EmbeddableFeatureBadge messages={messages} />);
    await userEvent.click(screen.getByText(`${count}`));
  }

  it('should render no badge', () => {
    render(<EmbeddableFeatureBadge messages={[]} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should render the message in the popover', async () => {
    render(
      <EmbeddableFeatureBadge
        messages={[
          {
            uniqueId: 'unique_id',
            shortMessage: 'Short message',
            longMessage: 'Long text',
            severity: 'info',
            fixableInEditor: false,
            displayLocations: [],
          },
        ]}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('1'));
    expect(await screen.findByText('Long text')).toBeInTheDocument();
  });

  it('should render a description of the badge in a tooltip on hover', async () => {
    await renderPopup([
      {
        uniqueId: 'unique_id',
        shortMessage: 'Short message',
        longMessage: 'Long text',
        severity: 'info',
        fixableInEditor: false,
        displayLocations: [],
      },
    ]);
    expect(await screen.findByText('1 visualization modifier')).toBeInTheDocument();
  });

  it('should render a separate section for each unique-id', async () => {
    await renderPopup([
      {
        uniqueId: '1',
        shortMessage: 'Section1',
        longMessage: 'Long text',
        severity: 'info',
        fixableInEditor: false,
        displayLocations: [],
      },
      {
        uniqueId: '2',
        shortMessage: 'Section2',
        longMessage: 'Long text 2',
        severity: 'info',
        fixableInEditor: false,
        displayLocations: [],
      },
    ]);
    expect(await screen.findByText('Section1')).toBeInTheDocument();
    expect(await screen.findByText('Section2')).toBeInTheDocument();
  });

  it('should group multiple messages with same id', async () => {
    await renderPopup(
      [
        {
          uniqueId: '1',
          shortMessage: 'Section1',
          longMessage: <div>LongText1</div>,
          severity: 'info',
          fixableInEditor: false,
          displayLocations: [],
        },
        {
          uniqueId: '1',
          shortMessage: 'Section1',
          longMessage: <div>LongText2</div>,
          severity: 'info',
          fixableInEditor: false,
          displayLocations: [],
        },
      ],
      1 // messages are grouped
    );
    expect(await screen.findByText('Section1')).toBeInTheDocument();
    expect(await screen.findAllByText('Section1')).toHaveLength(1);
    expect(await screen.findAllByText('LongText', { exact: false })).toHaveLength(2);
  });

  describe('Horizontal rules', () => {
    it('should render no rule for single message', async () => {
      await renderPopup([
        {
          uniqueId: 'unique_id',
          shortMessage: `Section1`,
          longMessage: <div>hello</div>,
          severity: 'info',
          fixableInEditor: false,
          displayLocations: [],
        },
      ]);
      expect(
        await screen.queryByTestId('lns-feature-badges-horizontal-rule')
      ).not.toBeInTheDocument();
    });
    it('should apply rules taking into account grouped messages', async () => {
      const messages: UserMessage[] = [
        {
          uniqueId: 'myId0',
          shortMessage: `Section2`,
          longMessage: <div>NoId</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
        // #1 rule here
        {
          uniqueId: 'myId',
          shortMessage: `Section1`,
          longMessage: <div>Grouped</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
        {
          uniqueId: 'myId',
          shortMessage: `Section1`,
          longMessage: <div>Grouped 2</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
        // #2 rule here
        {
          uniqueId: 'myOtherId',
          shortMessage: `Section2`,
          longMessage: <div>Grouped3</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
      ];
      await renderPopup(messages, 3);
      expect(await screen.getAllByTestId('lns-feature-badges-horizontal-rule')).toHaveLength(2);
    });
  });
});
