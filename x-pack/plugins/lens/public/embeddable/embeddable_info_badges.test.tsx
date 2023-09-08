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
import { EmbeddableFeatureBadge } from './embeddable_info_badges';
import { UserMessage } from '../types';

describe('EmbeddableFeatureBadge', () => {
  function renderPopup(messages: UserMessage[], count: number = messages.length) {
    render(<EmbeddableFeatureBadge messages={messages} />);
    userEvent.click(screen.getByText(`${count}`));
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
    userEvent.click(screen.getByText('1'));
    expect(await screen.findByText('Long text')).toBeInTheDocument();
  });

  it('should render a description of the badge in a tooltip on hover', async () => {
    renderPopup([
      {
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
    renderPopup([
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
    renderPopup(
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

  it('should render messages without id first, then grouped messages', async () => {
    renderPopup(
      [
        {
          shortMessage: 'Section2',
          longMessage: <div>AnotherText</div>,
          severity: 'info',
          fixableInEditor: false,
          displayLocations: [],
        },
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
      2 // last two messages are grouped
    );
    expect(await screen.findAllByText('Section', { exact: false })).toHaveLength(2);
    // now check the order
    const longMessages = await screen.findAllByText('Text', { exact: false });
    expect(longMessages[0]).toHaveTextContent('AnotherText');
    expect(longMessages[1]).toHaveTextContent('LongText1');
  });

  describe('Horizontal rules', () => {
    it('should render no rule for single message', async () => {
      renderPopup([
        {
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
    it('should apply an horizontal if there are multiple messages without id', async () => {
      const messages = [1, 2, 3].map((id) => ({
        shortMessage: `Section${id}`,
        longMessage: <div>{id}</div>,
        severity: 'info' as const,
        fixableInEditor: false,
        displayLocations: [],
      }));
      renderPopup(messages);
      expect(await screen.getAllByTestId('lns-feature-badges-horizontal-rule')).toHaveLength(
        messages.length - 1
      );
    });

    it('should apply a rule between messages without id and grouped ones', async () => {
      const messages = [
        {
          uniqueId: 'myId',
          shortMessage: `Section1`,
          longMessage: <div>Grouped</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
        {
          shortMessage: `Section2`,
          longMessage: <div>NoId</div>,
          severity: 'info' as const,
          fixableInEditor: false,
          displayLocations: [],
        },
      ];
      renderPopup(messages);
      expect(await screen.getAllByTestId('lns-feature-badges-horizontal-rule')).toHaveLength(1);
    });

    it('should apply rules taking into account grouped messages', async () => {
      const messages = [
        {
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
      renderPopup(messages, 3);
      expect(await screen.getAllByTestId('lns-feature-badges-horizontal-rule')).toHaveLength(2);
    });
  });
});
