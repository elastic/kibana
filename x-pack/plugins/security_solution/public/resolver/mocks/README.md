* reuse in mocks is good
  - because if all mocks need to change, you change them easier and have all the tests run against the new version?
    - if theres a bug in the way we make a mock, we want to fix it everywhere
    - the mock mocks something we have in production, so if the iterface or design that changes, all mocks need to change
* mocks should have deterministic, concrete, unique, interesting behavior:
  - a resolver tree with no ancestors
    - 2 children
    - the origin has 2 related events
  - 'when analyzing a tree with 2 children'
  - 'when analyzing a tree with no ancestors'

* internally to the 'mocks' module
  - feel free to use helpers, composition, configuration, parameters, etc

* mocks exported should have little or no configuration, a very specific name,

* mock metadata
  - when a mock uses interesting data like entity_ids, process names, times, PIDs, etc, that a test will check, then export that stuff in an object from the module that defines the mock
    - that way it can be used in the `describe` and `it` blocks that give the test a name

* prefer to mock DataAccessLayer and ResolverTree
  - also mock the payloads of any action
