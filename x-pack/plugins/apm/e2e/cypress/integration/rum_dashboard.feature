Feature: RUM Dashboard

  Scenario: Client metrics
    Given a user browses the APM UI application
    When the user inspects the real user monitoring tab
    Then should redirect to rum dashboard
      And should have correct client metrics
