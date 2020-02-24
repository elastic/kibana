# stories
as a dev, i can generate fake documents for use in mocking APIs, so that i can pretend the API is already implemented while developing the UI.
as a dev, i can generate fake documents for use in tests, so that I can populate actions with realistic data and instrument reducers, middlewares, and react code.
as a dev, i can generate fake documents and return them from API endpoints, so that I can unblock the UI work while implementing the API
as a dev, or tester, or anyone, i can run a script that will populate my ES with documents that approximate a faked demo environment, so that I can try out most of the UX workflows in the app without a real demo environment.

# tasks
- [ ] fix the date/string inconsistency in events (@oatkiller)
- [ ] document the fields on the types, and possibly rename the types, and audit they are used
- [ ] implement low level document oriented factory functions that provide mock values (maybe random) and take parameters that are used to generated related documents (e.g. create a process, then create its parent by specifying some fields.)
- [ ] use the low level factory functions to create a whole demo environment?
  - could be broken down to smaller tasks, like build a resolver tree?

## icebox
populate ES from an API integration test or functional test

# summary
a function you can import and call, and it gives you some fake alerts, or endpoints, or events

also a function you can import and call that will give an ES query that will populate ES with fake stuff?

also a CLI script that will take ES creds and? push fake data to it?

# notes
when accessing ES via functional tests or API integration tests, you get this client '@elastic/elasticsearch' https://github.com/elastic/kibana/blob/master/test/common/services/elasticsearch.ts#L22

this will take maintanance and needs upkeep. we'll be manually relating documents when creating em.
  - people to work on this long term (QA?)
  - some test to verify that the data matches? ECS?

If we use the same ts types as the rest of the plugin, we'll know that the documents are structurally the same as what we expect in the UI and backend. However, that doesn't mean they're matching ECS or the sensor. And it doesn't mean that the way we create related documents is correct.

its a non goal to populate ES with this fake generated data from API integration tests or functional tests. This is because a user could use the CLI script to populate their ES, then use esarchiver as usual to archive that data.
  - pros: you get to use standard es archiver, which can also unload data and select indices
  - cons: old tool, extra step, have to commit archived data, archives might have to be updated if the schema changes, whereas generated data would automatically be updated (because the generator would be updated to match schema changes.)

on randomness in generating data: we want complex data that looks realistic. it will better allow us to instrument the branches in our code. but if the data is random each time, tests using that data may be flaky. Consider using a seed for random data, this allows users of the function to pass the same seed if needed.
