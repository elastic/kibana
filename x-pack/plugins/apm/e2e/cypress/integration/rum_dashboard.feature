Feature: RUM Dashboard

  Scenario: Client metrics
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
      And should have correct client metrics

  Scenario: Page load distribution
    Given a user browses the APM UI application for RUM Data
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
      And should display percentile for page load chart
      And should display tooltip on hover
      And should display chart legend
    Given a user click page load breakdown filter
    When the user selected the breakdown
    Then breakdown series should appear in chart

    Given a user click the filter
    When the user select the filter
    And user applies the selected filter
    Then it filters the client metrics
