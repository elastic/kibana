Feature: CSM Dashboard

  Scenario: Client metrics
    When a user browses the APM UI application for RUM Data
    Then should have correct client metrics

  Scenario Outline: CSM page filters
    When the user filters by "<filterName>"
    Then it filters the client metrics "<filterName>"
    Examples:
      | filterName |
      | os         |
      | location   |

  Scenario: Display CSM Data components
    When a user browses the APM UI application for RUM Data
    Then should display percentile for page load chart
      And should display tooltip on hover
      And should display chart legend

  Scenario: Breakdown filter
    Given a user clicks the page load breakdown filter
    When the user selected the breakdown
    Then breakdown series should appear in chart

  Scenario: Service name filter
    When a user changes the selected service name
    Then it displays relevant client metrics
