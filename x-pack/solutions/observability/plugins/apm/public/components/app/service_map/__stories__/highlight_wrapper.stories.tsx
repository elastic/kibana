/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useEuiTheme } from '@elastic/eui';
import { HighlightWrapper } from '../../../shared/service_map/highlight_wrapper';
import { ServiceMapSearchProvider } from '../../../shared/service_map/service_map_search_context';
import { WithSearchHighlight } from './search_highlight_helper';

const PlaceholderNode = ({ label }: { label: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: euiTheme.colors.backgroundBasePlain,
        border: `2px solid ${euiTheme.colors.mediumShade}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        color: euiTheme.colors.textSubdued,
      }}
    >
      {label}
    </div>
  );
};

const LabelText = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: euiTheme.colors.textSubdued }}>{children}</div>
  );
};

const meta: Meta<typeof HighlightWrapper> = {
  title: 'app/ServiceMap/HighlightWrapper',
  component: HighlightWrapper,
  decorators: [
    (Story) => (
      <ServiceMapSearchProvider>
        <Story />
      </ServiceMapSearchProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const AllStates: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <HighlightWrapper nodeId="no-highlight">
          <PlaceholderNode label="Node" />
        </HighlightWrapper>
        <LabelText>No highlight</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <HighlightWrapper nodeId="context-only" contextHighlight>
          <PlaceholderNode label="Node" />
        </HighlightWrapper>
        <LabelText>Context highlight</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <WithSearchHighlight matchNodeIds={new Set(['inactive-match'])} activeMatchNodeId={null}>
          <HighlightWrapper nodeId="inactive-match">
            <PlaceholderNode label="Node" />
          </HighlightWrapper>
        </WithSearchHighlight>
        <LabelText>Search match (inactive)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <WithSearchHighlight
          matchNodeIds={new Set(['active-match'])}
          activeMatchNodeId="active-match"
        >
          <HighlightWrapper nodeId="active-match">
            <PlaceholderNode label="Node" />
          </HighlightWrapper>
        </WithSearchHighlight>
        <LabelText>Active search match</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <WithSearchHighlight
          matchNodeIds={new Set(['search-overrides'])}
          activeMatchNodeId="search-overrides"
        >
          <HighlightWrapper nodeId="search-overrides" contextHighlight>
            <PlaceholderNode label="Node" />
          </HighlightWrapper>
        </WithSearchHighlight>
        <LabelText>Search overrides context</LabelText>
      </div>
    </div>
  ),
};
