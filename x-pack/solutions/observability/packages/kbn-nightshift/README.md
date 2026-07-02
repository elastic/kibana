# @kbn/nightshift

Reusable React components for the Nightshift observability surface. The package
is presentation-only — components take pre-prepared props, render with EUI
semantic tokens, and never reach into the streams_app schema or any plugin
state.

## Overview

Nightshift summarises significant events and their impacted knowledge
indicators on a single dedicated surface. This package provides the visual
building blocks for that surface:

- **`MetadataKICard`** — compact pill for an impacted Knowledge Indicator
  (e.g. `Service: payment`). Composes into the "Impacted knowledge indicators"
  panel.
- **`SignificantEventItem`** — stackable row for a single event with title,
  summary, timestamp and status.
- **`SignificantEventList`** — composition wrapper around 1..N
  `SignificantEventItem`s that manages corner radii, border merging and
  single-selection state.
- **`SignificantEventSummary`** — four-card row that displays counts per
  lifecycle bucket (Require action / In progress / Resolved / Demoted).

## Installation

This package lives in the Kibana monorepo and is available as a shared browser
package.

```ts
import {
  MetadataKICard,
  SignificantEventItem,
  SignificantEventList,
  SignificantEventSummary,
} from '@kbn/nightshift';
```

## Components

### MetadataKICard

A compact pill (height 58px, min-width 170px) that displays one impacted
Knowledge Indicator as a subtype label above a name. Two states:

- **default** — `colors.backgroundBaseDanger`, transparent border
- **selected** — `colors.backgroundLightDanger`, strong danger border
- **hover** (when `onClick` is provided) — subtle danger border appears

When `onClick` is provided the card renders as a `<button type="button">`
with `aria-pressed` reflecting `selected`. When `onClick` is omitted it
renders a `<div>` with `aria-current="true"` while selected so screen
readers can still convey the current-selection state.

```tsx
<MetadataKICard
  subtype="Service"
  name="payment"
  selected={selectedId === 'svc-payment'}
  onClick={() => toggle('svc-payment')}
/>
```

| Prop             | Type         | Required | Description                                                                                  |
| ---------------- | ------------ | -------- | -------------------------------------------------------------------------------------------- |
| `subtype`        | `string`     | yes      | Small label above the name. Already translated.                                              |
| `name`           | `string`     | yes      | Primary identifier (e.g. `"payment"`, `"checkout → payment"`). Already translated.           |
| `selected`       | `boolean`    | no       | Visual selected state. Pair with `onClick` for toggle behavior. Defaults to `false`.         |
| `onClick`        | `() => void` | no       | When provided, card becomes a real `<button>` with hover, focus-visible and keyboard.        |
| `data-test-subj` | `string`     | no       | Test subject hook. Defaults to `"metadataKICard"`.                                           |

### SignificantEventItem

A single event row, ~74px min height, with an expand/minimize icon, title
(h6 + semiBold + `textPrimary`), summary, formatted timestamp, and a status
pill. Two optional action buttons ("Start a chat" + overflow) appear on
hover / focus-within / when selected — they live as **siblings** of the
trigger button, not nested inside it, so the ARIA tree stays flat (one
disclosure trigger per row).

```tsx
<SignificantEventItem
  title="Intermittent login failures on userportal.net"
  summary="Our authentication system is timing out under load"
  detectedAt={event['@timestamp']}
  status={{ label: 'Take an action', color: 'danger' }}
  selected={open}
  controls={flyoutId}
  onClick={() => setOpen((prev) => !prev)}
  onStartChat={() => openChat(event)}
  startChatLabel={i18n.translate('myFeature.startChat', { defaultMessage: 'Start a chat' })}
  onMoreClick={(anchor) => openMenu(anchor)}
  moreActionsAriaLabel={i18n.translate('myFeature.moreActions', { defaultMessage: 'More actions' })}
/>
```

| Prop                   | Type                                                  | Required | Description                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                | `string`                                              | yes      | Headline (h6 + semiBold + `textPrimary`). Wired to the trigger via `aria-labelledby` so the button's accessible name is exactly the title.                                                                                                        |
| `summary`              | `string`                                              | yes      | Short body copy. Maps to `SigEvent.summary` (`@kbn/streams-schema`).                                                                                                                                                                              |
| `detectedAt`           | `string \| Date`                                      | yes      | ISO 8601 string or `Date`. Default renders an auto-updating `<FormattedRelative />` from `@kbn/i18n-react`.                                                                                                                                       |
| `formatDetectedAt`     | `(value: string \| Date) => React.ReactNode`          | no       | Override the default renderer. Return any `ReactNode` — e.g. `<FormattedDate />` for absolute display, a tooltip-wrapped span, or a plain string.                                                                                                  |
| `status`               | `SignificantEventItemStatus`                          | yes      | `{ label: string; color: SignificantEventItemStatusColor }`. Color restricted to EUI semantic names — see below.                                                                                                                                  |
| `placement`            | `'single' \| 'top' \| 'middle' \| 'bottom'`           | no       | Controls which corners are rounded so adjacent items fuse into one surface. Defaults to `'single'`. `SignificantEventList` overrides this per-item; consumers should not set anything other than `'single'` outside that context.                  |
| `selected`             | `boolean`                                             | no       | When `true`: background goes `backgroundBasePrimary`, left icon becomes `minimize`, action buttons are always visible, `aria-expanded` on the trigger is `true`. Defaults to `false`.                                                              |
| `onClick`              | `() => void`                                          | no       | Click handler fired by the trigger button (mouse + native keyboard activation). When omitted the row is non-interactive.                                                                                                                          |
| `controls`             | `string`                                              | no       | Id of the flyout / panel this row toggles. Wired to `aria-controls` on the trigger so screen readers announce the disclosure relationship.                                                                                                        |
| `onStartChat`          | `() => void`                                          | no       | When provided, renders a "Start a chat" `EuiButtonEmpty` revealed on hover / focus-within / selected.                                                                                                                                              |
| `startChatLabel`       | `string`                                              | no       | Label rendered on the "Start a chat" button. Pass an already translated string. Defaults to `"Start a chat"` (English) — defaults exist so stories work; production consumers should always pass a translated label.                              |
| `onMoreClick`          | `(target: HTMLElement) => void`                       | no       | When provided, renders the `boxesVertical` icon button. Receives the triggering element so callers can anchor an `EuiPopover`.                                                                                                                    |
| `moreActionsAriaLabel` | `string`                                              | no       | Accessible label for the overflow icon button. Pass an already translated string. Defaults to `"More actions"`.                                                                                                                                    |
| `loading`              | `boolean`                                             | no       | Renders skeleton placeholders for title / summary / meta. Action buttons are not rendered while loading.                                                                                                                                          |
| `data-test-subj`       | `string`                                              | no       | Test subject hook. Defaults to `"significantEventItem"`. The trigger button is `${dataTestSubj}-trigger`; sub-subjects include `-leftIcon`, `-startChat`, `-more`, `-skeleton` (when loading).                                                     |

**`SignificantEventItemStatusColor`** (restricted union):

```ts
'primary' | 'success' | 'accent' | 'warning' | 'danger' | 'subdued'
```

This intentionally excludes hex strings to keep the design language coherent
across consumers.

### SignificantEventList

Stacks 1..N `SignificantEventItem`s into a single grouped surface. Owns
placement assignment (which corners are rounded), single-selection toggle,
and max-width clamping.

Designed for up to **~20 items**. Beyond that a dev-only `console.warn`
fires (the list still renders everything; the warning is a hint to
paginate or virtualize).

```tsx
<SignificantEventList
  items={mappedEvents}
  selectedId={selectedId}
  onSelect={setSelectedId}
  onStartChat={(id) => openChat(id)}
  onMoreClick={(id, anchor) => openMenu(id, anchor)}
/>
```

| Prop                   | Type                                                  | Required | Description                                                                                                                            |
| ---------------------- | ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                | `SignificantEventListItem[]`                          | yes      | Ordered list. The list assigns `placement` automatically. Returns `null` when empty.                                                   |
| `selectedId`           | `string \| null`                                      | no       | Controlled single-selection model. Pass `null` (or omit) for no selection.                                                              |
| `onSelect`             | `(id: string \| null) => void`                        | no       | Fired on row click. Receives the id, or `null` when the currently selected item is being deselected.                                   |
| `controls`             | `string`                                              | no       | Forwarded to every item as `controls` so the trigger buttons set `aria-controls={flyoutId}`.                                            |
| `onStartChat`          | `(id: string) => void`                                | no       | When provided, renders the "Start a chat" action on every item.                                                                        |
| `startChatLabel`       | `string`                                              | no       | Forwarded to every item.                                                                                                               |
| `onMoreClick`          | `(id: string, target: HTMLElement) => void`           | no       | When provided, renders the overflow icon on every item.                                                                                |
| `moreActionsAriaLabel` | `string`                                              | no       | Forwarded to every item.                                                                                                               |
| `formatDetectedAt`     | `(value: string \| Date) => React.ReactNode`          | no       | Forwarded to every item so the timestamp renderer can be set once for the whole list.                                                  |
| `maxWidth`             | `number`                                              | no       | Pixel cap on the list width. Defaults to `760`. The list is always `width: 100%` up to this cap.                                       |
| `data-test-subj`       | `string`                                              | no       | Test subject hook. Defaults to `"significantEventList"`. Item subjects are `${dataTestSubj}-item-${item.id}`.                          |

**`SignificantEventListItem`**:

```ts
interface SignificantEventListItem {
  id: string;
  title: string;
  summary: string;             // maps to SigEvent.summary
  detectedAt: string | Date;   // ISO or Date; formatted by item
  status: SignificantEventItemStatus;
}
```

### SignificantEventSummary

Four-card stat row for the Nightshift overview. Each card is an
`EuiPanel` + `EuiStat` + leading avatar. Presentation-only (no click
behavior).

The "In progress" avatar animates a spinner when `inProgress > 0` and
falls back to a static `dashedCircle` icon when `inProgress === 0` (so
we don't visually suggest active work that isn't happening).

```tsx
<SignificantEventSummary
  requireAction={promotedCount}
  inProgress={acknowledgedCount}
  resolved={resolvedCount}
  demoted={demotedCount}
/>
```

| Prop             | Type     | Required | Description                                                             |
| ---------------- | -------- | -------- | ----------------------------------------------------------------------- |
| `requireAction`  | `number` | yes      | Count of events to act on. Maps to `SigEvent.status === 'promoted'`.    |
| `inProgress`     | `number` | yes      | Count being investigated. Maps to `SigEvent.status === 'acknowledged'`. |
| `resolved`       | `number` | yes      | Count resolved. Maps to `SigEvent.status === 'resolved'`.               |
| `demoted`        | `number` | yes      | Count demoted. Maps to `SigEvent.status === 'demoted'`.                 |
| `data-test-subj` | `string` | no       | Test subject hook. Defaults to `"significantEventSummary"`.             |

Cards wrap to fewer columns on narrow viewports via `EuiFlexGroup
responsive`. Each card also has a deterministic test subject:
`${dataTestSubj}-${categoryId}` where `categoryId` is `requireAction`,
`inProgress`, `resolved` or `demoted`.

## Patterns

### Wiring `NightshiftApp` into the observability route

The exported `NightshiftApp` currently renders the "Coming soon" empty
state. Replacing it with the real layout is one component import + one
fetch hook in the consuming plugin:

```tsx
// x-pack/solutions/observability/plugins/observability/public/pages/nightshift/nightshift.tsx
import {
  SignificantEventSummary,
  SignificantEventList,
  MetadataKICard,
} from '@kbn/nightshift';

export function NightshiftPage() {
  const { summary, events, impactedKis, isLoading } = useNightshiftData();
  return (
    <ObservabilityPageTemplate data-test-subj="nightshiftPage">
      <SignificantEventSummary
        requireAction={summary.requireAction}
        inProgress={summary.inProgress}
        resolved={summary.resolved}
        demoted={summary.demoted}
      />
      <EuiSpacer />
      <SignificantEventList
        items={events.map(toListItem)}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStartChat={openChat}
      />
      {/* etc */}
    </ObservabilityPageTemplate>
  );
}
```

### Click an item to open a push flyout

The canonical "select an event, see its details" interaction:

```tsx
import { FormattedRelative } from '@kbn/i18n-react';

function EventList({ events }: { events: SigEvent[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flyoutId = useGeneratedHtmlId();
  const selected = events.find((e) => e.event_id === selectedId) ?? null;

  return (
    <>
      <SignificantEventList
        items={events.map(toListItem)}
        selectedId={selectedId}
        onSelect={setSelectedId}
        controls={flyoutId}
        onStartChat={(id) => agentBuilder.openChat({ context: id })}
      />

      {selected && (
        <EuiFlyout id={flyoutId} type="push" size="s" onClose={() => setSelectedId(null)}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle><h2>{selected.title}</h2></EuiTitle>
            <EuiText size="s" color="subdued">
              Detected <FormattedRelative value={selected['@timestamp']} />
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{/* SigEventDetails */}</EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}
```

### Map `SigEvent` to `SignificantEventListItem`

`@kbn/nightshift` does not ship a `SigEvent → SignificantEventListItem`
mapper — the streams_app team owns that mapping so schema changes don't
cross the package boundary. A typical mapping:

```ts
import type { SigEvent, SigEventStatus } from '@kbn/streams-schema';
import {
  SIG_EVENT_STATUS_LABELS,
} from '../shared/translations';
import type {
  SignificantEventItemStatusColor,
  SignificantEventListItem,
} from '@kbn/nightshift';

const STATUS_COLOR: Record<SigEventStatus, SignificantEventItemStatusColor> = {
  promoted: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
  demoted: 'subdued',
};

export function toListItem(event: SigEvent): SignificantEventListItem {
  return {
    id: event.event_id,
    title: event.title,
    summary: event.summary,
    detectedAt: event['@timestamp'],
    status: {
      label: SIG_EVENT_STATUS_LABELS[event.status],
      color: STATUS_COLOR[event.status],
    },
  };
}
```

### Loading state for the list

While fetching events, render a stack of `SignificantEventItem`s with
`loading={true}` so the row dimensions don't jump when content arrives:

```tsx
{isLoading ? (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <SignificantEventItem
        key={`skeleton-${i}`}
        title=""
        summary=""
        detectedAt=""
        status={{ label: '', color: 'subdued' }}
        placement={i === 0 ? 'top' : i === 4 ? 'bottom' : 'middle'}
        loading
      />
    ))}
  </>
) : (
  <SignificantEventList items={events.map(toListItem)} ... />
)}
```

### Telemetry

The components emit no telemetry. Wire your plugin's telemetry client
inside the callbacks you pass:

```tsx
<SignificantEventList
  onSelect={(id) => {
    analytics?.reportEvent('nightshift.event.selected', { eventId: id });
    setSelectedId(id);
  }}
  onStartChat={(id) => {
    analytics?.reportEvent('nightshift.chat.opened', { eventId: id });
    openChat(id);
  }}
/>
```

### Responsive grid of `MetadataKICard`

The cards have `min-width: 170px` and no `max-width`. Drop them into a CSS
grid with `auto-fit` + `minmax(170px, 1fr)` so they share row width equally
and wrap as the container narrows:

```tsx
<div
  css={css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: ${euiTheme.size.s};
    & > * { width: 100%; }
  `}
>
  {impactedKis.map((ki) => (
    <MetadataKICard key={ki.id} subtype={ki.subtype} name={ki.name} />
  ))}
</div>
```

The `& > * { width: 100% }` rule is required because native `<button>`
elements (which the interactive `MetadataKICard` renders) don't stretch in
grid cells across browsers without an explicit width.

## Design tokens

All visual decisions resolve through `useEuiTheme()`. No hex literals; no
custom colors. Quick reference for the values this package touches:

| Component / state                       | Token                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `MetadataKICard` default bg             | `colors.backgroundBaseDanger`                                                              |
| `MetadataKICard` selected bg            | `colors.backgroundLightDanger`                                                             |
| `MetadataKICard` selected border        | `colors.borderStrongDanger`                                                                |
| `MetadataKICard` hover border           | `colors.borderBaseDanger`                                                                  |
| `MetadataKICard` text                   | `colors.textDanger`                                                                        |
| `SignificantEventItem` default bg       | `colors.backgroundBasePlain`                                                               |
| `SignificantEventItem` hover bg         | `colors.backgroundBaseSubdued`                                                             |
| `SignificantEventItem` selected bg      | `colors.backgroundBasePrimary`                                                             |
| `SignificantEventItem` border           | `colors.borderBaseSubdued`                                                                 |
| `SignificantEventItem` title color      | `colors.textPrimary` (semiBold)                                                            |
| `SignificantEventItem` meta color       | `colors.textSubdued`                                                                       |
| `SignificantEventSummary` avatars       | `backgroundBaseDanger / Warning / Success / Subdued` + matching `textDanger / textSubdued` |
| All radii                               | `border.radius.medium` (4px)                                                               |
| All transitions                         | `animation.fast` × `animation.resistance`, disabled under `prefers-reduced-motion`         |

## Storybook

```bash
yarn storybook nightshift
```

Stories live under **app/Nightshift** in the sidebar, with the three
significant-event components grouped under **Significant events**. The
Storybook preview wraps every story in `I18nProvider` so components that
use `<FormattedRelative />` render correctly.

## Tests

```bash
node scripts/jest x-pack/solutions/observability/packages/kbn-nightshift
```
