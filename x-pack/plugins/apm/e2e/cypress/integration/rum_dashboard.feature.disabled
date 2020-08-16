Feature: RUM Dashboard

  Scenario: Client metrics
    When a user browses the APM UI application for RUM Data
    Then should have correct client metrics

  Scenario Outline: Rum page filters
    When the user filters by "<filterName>"
    Then it filters the client metrics
    Examples:
      | filterName |
      | os         |
      | location   |

  Scenario: Page load distribution percentiles
    When a user browses the APM UI application for RUM Data
    Then should display percentile for page load chart

  Scenario: Page load distribution chart tooltip
    When a user browses the APM UI application for RUM Data
    Then should display tooltip on hover

  Scenario: Page load distribution chart legends
    When a user browses the APM UI application for RUM Data
    Then should display chart legend

  Scenario: Breakdown filter
    Given a user click page load breakdown filter
    When the user selected the breakdown
    Then breakdown series should appear in chart

  Scenario: Service name filter
    When a user changes the selected service name
    Then it displays relevant client metrics
