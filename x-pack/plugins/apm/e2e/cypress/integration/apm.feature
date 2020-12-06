Feature: APM

  Scenario: Transaction duration charts
    Given a user browses the APM UI application
    When the user inspects the opbeans-node service
    Then should redirect to correct path with correct params