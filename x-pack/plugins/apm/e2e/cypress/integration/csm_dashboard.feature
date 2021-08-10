Feature: CSM Dashboard

  Scenario: Client metrics
    When a user browses the APM UI application for RUM Data
    Then should have correct client metrics

  Scenario: JS Errors
    When a user browses the APM UI application for RUM Data
    Then it displays list of relevant js errors

  Scenario: Percentile select
    When the user changes the selected percentile
    Then it displays client metric related to that percentile

  Scenario Outline: CSM page filters
    When the user filters by "<filterName>"
    Then it filters the client metrics "<filterName>"
    Examples:
      | filterName |
      | OS         |
      | Location   |

  Scenario: Display CSM Data components
    When a user browses the APM UI application for RUM Data
    Then should display percentile for page load chart
      And should display tooltip on hover

  Scenario: Search by url filter focus
    When a user clicks inside url search field
    Then it displays top pages in the suggestion popover

  Scenario: Search by url filter
    When a user enters a query in url search field
    Then it should filter results based on query
