Feature: APM

  Scenario: User is redirected to Service Overview page
    Given a user browses the APM UI application
    When the user inspects the opbeans-node service
    Then should redirect to correct service overview page

