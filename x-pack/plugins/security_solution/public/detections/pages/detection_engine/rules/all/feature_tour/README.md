# Feature Tour on the Rule Management Page

This folder contains an implementation of a feature tour UI for new features introduced in `8.1.0`.
This implementaion is currently unused - all usages have been removed from React components.
We might revisit this implementation in the next releases when we have something new for the user
to demonstrate on the Rule Management Page.

## A new way of building tours

The EUI Tour has evolved and continues to do so.

EUI folks have implemented a new programming model for defining tour steps and binding them to
UI elements on a page ([ticket][1], [PR][2]). When we revisit the Tour UI, we should build it
differently - using the new `anchor` property and consolidating all the tour steps and logic
in a single component. We shouldn't need to wrap the page with the provider anymore. And there's
[a chance][3] that this implementation based on query selectors will have fewer UI glitches.

New features and fixes to track:

- Support for previous, next and go to step [#4831][4]
- Built-in 'Next' button [#5715][5]
- Popover on the EuiTour component doesn't respect the anchorPosition prop [#5731][6]

## How to revive this tour for the next release (if needed)

1. Update Kibana version in `RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY`.
  Set it to a version you're going to implement a feature tour for.

1. Define steps for your tour. See `RulesFeatureTourContextProvider` and `stepsConfig`.

1. Rewrite the implementation using the new `anchor` property and targeting UI elements
  from steps using query selectors. Consolidate all the steps and their `<EuiTourStep>`
  components in a single `RuleManagementPageFeatureTour` component. Render this component
  in the Rule Management page. Get rid of `RulesFeatureTourContextProvider` - we shouldn't
  need to wrap the page and pass anything down the tree anymore.

1. Consider abstracting away persistence in Local Storage and other functionality that
  may be common to tours on different pages.

## Useful links

Docs: [`EuiTour`](https://elastic.github.io/eui/#/display/tour).

For reference, PRs where this Tour has been introduced or changed:

- added in `8.1.0` ([PR](https://github.com/elastic/kibana/pull/124343))
- removed in `8.2.0` ([PR](https://github.com/elastic/kibana/pull/128398))

<!-- Links -->

[1]: https://github.com/elastic/kibana/issues/124052
[2]: https://github.com/elastic/eui/pull/5696
[3]: https://github.com/elastic/eui/issues/5731#issuecomment-1075202910
[4]: https://github.com/elastic/eui/issues/4831
[5]: https://github.com/elastic/eui/issues/5715
[6]: https://github.com/elastic/eui/issues/5731
