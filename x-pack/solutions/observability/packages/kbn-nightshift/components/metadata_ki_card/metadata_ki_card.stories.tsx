/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetadataKICard, type MetadataKICardProps } from './metadata_ki_card';

const meta: Meta<typeof MetadataKICard> = {
  title: 'app/Nightshift/MetadataKICard',
  component: MetadataKICard,
  args: {
    subtype: 'Service',
    name: 'payment',
    selected: false,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MetadataKICard>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

/**
 * Demonstrates the controlled selection pattern: the parent owns the
 * `selected` state and toggles it from `onClick`.
 */
function InteractiveExample(args: MetadataKICardProps) {
  const [selected, setSelected] = useState(false);
  return (
    <MetadataKICard {...args} selected={selected} onClick={() => setSelected((prev) => !prev)} />
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveExample {...args} />,
};

/**
 * Click the card to mark it selected and open an `EuiFlyout` with its
 * details. Closing the flyout deselects the card. This is the canonical
 * usage pattern for the impacted-indicators feature.
 */
function WithFlyoutExample(args: MetadataKICardProps) {
  const [open, setOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <>
      <MetadataKICard {...args} selected={open} onClick={() => setOpen(true)} />
      {open && (
        <EuiFlyout
          type="push"
          size="s"
          onClose={() => setOpen(false)}
          aria-labelledby={flyoutTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{args.name}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {args.subtype}
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>Details about the impacted knowledge indicator go here.</p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

export const WithFlyout: Story = {
  render: (args) => <WithFlyoutExample {...args} />,
};

interface ImpactedKi {
  id: string;
  subtype: string;
  name: string;
}

const SAMPLE_IMPACTED_KIS: ImpactedKi[] = [
  { id: 'svc-payment', subtype: 'Service', name: 'payment' },
  { id: 'dep-checkout-payment', subtype: 'Dependency', name: 'checkout → payment' },
  { id: 'svc-servicepdp', subtype: 'Service', name: 'servicePDP' },
  { id: 'infra-gcp-east', subtype: 'Infrastructure', name: 'gcp-east' },
];

/**
 * Full composition example showing how engineers should assemble the
 * "Impacted knowledge indicators" panel from EUI primitives + the
 * `MetadataKICard` building block.
 *
 * - `EuiAccordion` provides the panel chrome, chevron and `extraAction`
 *   slot for "Explain this".
 * - `EuiHealth color="danger"` provides the red dot in the header.
 * - A CSS grid (`auto-fit, minmax(170px, 1fr)`) lays out the cards: they
 *   always share the row equally and wrap symmetrically as the container
 *   narrows.
 * - The story owns the single-selection state and the flyout.
 *
 * This file intentionally does not export a wrapper component — the
 * composition is intended to live in the consuming plugin so it can be
 * wired to real data, telemetry and routing.
 */
function ImpactedPanelExample() {
  const { euiTheme } = useEuiTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flyoutTitleId = useGeneratedHtmlId();
  const accordionId = useGeneratedHtmlId({ prefix: 'impactedKis' });

  /*
   * Responsive equal-width grid: every card shares the row equally
   * (`1fr` columns) but no column ever dips below the card's
   * `min-width` (170px). When the container can't fit another
   * 170px column, `auto-fit` drops one and the existing columns
   * grow to absorb the freed space. Result: cards always fill the
   * row, and they wrap symmetrically as the viewport narrows.
   *
   * `& > *` forces each card to expand to its grid cell width.
   * Native `<button>` elements (which `MetadataKICard` renders when
   * interactive) don't reliably stretch in grid cells across
   * browsers without this — they default to intrinsic content size.
   */
  const gridStyles = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: ${euiTheme.size.s};

    & > * {
      width: 100%;
    }
  `;

  const selected = SAMPLE_IMPACTED_KIS.find((item) => item.id === selectedId) ?? null;

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      <EuiPanel hasBorder paddingSize="m">
        <EuiAccordion
          id={accordionId}
          initialIsOpen
          buttonContent={
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiHealth color="danger" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{SAMPLE_IMPACTED_KIS.length} Impacted knowledge indicators</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          extraAction={
            <EuiButtonEmpty
              size="xs"
              iconType="productAgent"
              data-test-subj="impactedKisExplainButton"
              onClick={() => {
                // wire to telemetry / Nightshift "explain" flow
              }}
            >
              Explain this
            </EuiButtonEmpty>
          }
        >
          <EuiSpacer size="m" />
          <div css={gridStyles}>
            {SAMPLE_IMPACTED_KIS.map((item) => (
              <MetadataKICard
                key={item.id}
                subtype={item.subtype}
                name={item.name}
                selected={selectedId === item.id}
                onClick={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
              />
            ))}
          </div>
        </EuiAccordion>
      </EuiPanel>

      {selected && (
        <EuiFlyout
          type="push"
          size="s"
          onClose={() => setSelectedId(null)}
          aria-labelledby={flyoutTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{selected.name}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {selected.subtype}
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>Details about the impacted knowledge indicator go here.</p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </div>
  );
}

export const InImpactedPanel: StoryObj = {
  parameters: { layout: 'padded' },
  render: () => <ImpactedPanelExample />,
};
