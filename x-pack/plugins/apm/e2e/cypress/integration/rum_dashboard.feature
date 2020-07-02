Feature: RUM Dashboard

  Scenario: Client metrics
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
      And should have correct client metrics

  Scenario Outline: Rum page filters
    When the user filters by "<filterName>"
    Then it filters the client metrics
    Examples:
      | filterName |
      | os         |
      | location   |

  Scenario: Page load distribution percentiles
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
      And should display percentile for page load chart

  Scenario: Page load distribution chart tooltip
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
    And should display tooltip on hover

  Scenario: Page load distribution chart legends
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
    And should display chart legend

  Scenario: Breakdown filter
    Given a user click page load breakdown filter
    When the user selected the breakdown
    Then breakdown series should appear in chart

  Scenario: Service name filter
    When a user changes the selected service name
    Then it displays relevant client metrics
